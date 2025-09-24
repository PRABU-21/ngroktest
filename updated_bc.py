from fastapi import FastAPI, File, UploadFile, Form, Body
from pydantic import BaseModel
from typing import List, Dict, Optional
from sentence_transformers import SentenceTransformer, util
import uvicorn
import os
import json
from pyngrok import ngrok
import shutil
from datetime import datetime

# ==============================
# Configurable weights
# ==============================
WEIGHTS = {
    "skill": 0.5,
    "semantic": 0.3,
    "location": 0.1,
    "experience": 0.1
}
RURAL_BONUS = 0.1
SOCIAL_BONUS = {"SC": 0.08, "ST": 0.1, "OBC": 0.05, "General": 0.0}
PAST_PARTICIPATION_PENALTY = 0.15

# ==============================
# FastAPI app
# ==============================
app = FastAPI()

# ==============================
# Model load (once)
# ==============================
print("[INFO] Loading embedding model...")
model = SentenceTransformer("all-MiniLM-L6-v2")
print("[INFO] Model loaded successfully.")

# ==============================
# Upload folders
# ==============================
UPLOAD_DIR = "/kaggle/working/uploads"
JOBS_DIR = "/kaggle/working/jobs"

# Create directories if they don't exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(JOBS_DIR, exist_ok=True)

# Global variable to store current job description
CURRENT_JOB = None

# ==============================
# Helper functions
# ==============================
def profile_to_text(profile):
    return f"Name: {profile['name']}. Skills: {', '.join(profile['skills'])}. Location: {profile['location']}. Experience: {profile['experience']}."

def skills_match_fraction(candidate_skills, req_skills):
    return sum(1 for s in req_skills if s in candidate_skills) / len(req_skills)

def location_score(candidate_loc, req_loc):
    return 1.0 if candidate_loc.strip().lower() == req_loc.strip().lower() else 0.0

def experience_score(candidate_exp):
    if "fresher" in candidate_exp.lower() or "months" in candidate_exp:
        return 1.0
    if "1 year" in candidate_exp:
        return 0.9
    if "2 year" in candidate_exp:
        return 0.6
    if "research" in candidate_exp.lower():
        return 0.8
    return 0.5

def compute_hybrid_score(cand, intern_emb, cand_emb, internship):
    skill_frac = skills_match_fraction(cand['skills'], internship['required_skills'])
    sem_sim = util.pytorch_cos_sim(cand_emb, intern_emb).item()
    loc = location_score(cand['location'], internship['location'])
    exp = experience_score(cand['experience'])
    base = (
        WEIGHTS['skill'] * skill_frac
        + WEIGHTS['semantic'] * sem_sim
        + WEIGHTS['location'] * loc
        + WEIGHTS['experience'] * exp
    )
    adj = 0.0
    if cand['rural']:
        adj += RURAL_BONUS
    adj += SOCIAL_BONUS.get(cand['social'], 0.0)
    if cand['past_participation']:
        adj -= PAST_PARTICIPATION_PENALTY
    if internship.get('targeted_social') and cand['social'] == internship['targeted_social']:
        adj += 0.06
    final_score = max(0.0, base + adj)
    breakdown = {
        "skill_frac": skill_frac,
        "semantic_sim": sem_sim,
        "location": loc,
        "experience": exp,
        "social_bonus": SOCIAL_BONUS.get(cand['social'], 0.0),
        "rural_bonus": RURAL_BONUS if cand['rural'] else 0.0,
        "past_penalty": PAST_PARTICIPATION_PENALTY if cand['past_participation'] else 0.0,
        "final_score": final_score
    }
    return final_score, breakdown

def select_candidates(internship, candidates, num_candidates=None):
    """
    Select candidates based on internship criteria
    
    Args:
        internship: Dictionary with internship details
        candidates: List of candidate dictionaries
        num_candidates: Optional number of candidates to select (overrides capacity)
    """
    filtered_candidates = [c for c in candidates if not c.get("has_experience", False)]
    if not filtered_candidates:
        return {"selected": [], "message": "No fresher candidates found."}

    candidate_texts = [profile_to_text(c) for c in filtered_candidates]
    intern_text = internship['description']
    candidate_embeddings = model.encode(candidate_texts, convert_to_tensor=True)
    intern_embedding = model.encode(intern_text, convert_to_tensor=True)

    scores_breakdowns = [
        compute_hybrid_score(c, intern_embedding, ce, internship)
        for c, ce in zip(filtered_candidates, candidate_embeddings)
    ]

    # Sort all candidates by score for simple top-N selection if num_candidates is specified
    if num_candidates is not None:
        all_candidates = [(c, s, bd) for (c, (s, bd)) in zip(filtered_candidates, scores_breakdowns)]
        all_candidates.sort(key=lambda x: x[1], reverse=True)
        selected = all_candidates[:int(num_candidates)]
    else:
        # Otherwise use the quota-based selection
        selected = []
        capacity = internship['capacity']

        # Rural quota
        rural_needed = internship['quotas'].get('rural_min', 0)
        rural_candidates = [
            (c, s, bd) for (c, (s, bd)) in zip(filtered_candidates, scores_breakdowns) if c['rural']
        ]
        rural_candidates.sort(key=lambda x: x[1], reverse=True)
        for c, s, bd in rural_candidates[:rural_needed]:
            selected.append((c, s, bd))
            capacity -= 1

        # SC/ST quotas
        for cat_key, quota_key in [('SC', 'SC_min'), ('ST', 'ST_min')]:
            cat_needed = internship['quotas'].get(quota_key, 0)
            cat_candidates = [
                (c, s, bd)
                for (c, (s, bd)) in zip(filtered_candidates, scores_breakdowns)
                if c['social'] == cat_key and (c, s, bd) not in selected
            ]
            cat_candidates.sort(key=lambda x: x[1], reverse=True)
            for c, s, bd in cat_candidates[:cat_needed]:
                if capacity > 0:
                    selected.append((c, s, bd))
                    capacity -= 1

        # Remaining best
        remaining = [
            (c, s, bd)
            for (c, (s, bd)) in zip(filtered_candidates, scores_breakdowns)
            if (c, s, bd) not in selected
        ]
        remaining.sort(key=lambda x: x[1], reverse=True)
        for c, s, bd in remaining[:capacity]:
            selected.append((c, s, bd))

    response = []
    for cand, score, bd in selected:
        response.append({
            "id": cand["id"],
            "name": cand["name"],
            "skills": cand["skills"],
            "location": cand["location"],
            "experience": cand["experience"],
            "social": cand["social"],
            "rural": cand["rural"],
            "past_participation": cand["past_participation"],
            "final_score": bd["final_score"],
            "breakdown": bd
        })
    return {"selected": response, "message": f"Selected {len(response)} candidates."}

# ==============================
# API Models
# ==============================
class Internship(BaseModel):
    id: int
    title: str
    description: str
    required_skills: List[str]
    location: str
    capacity: int
    quotas: Dict[str, int]
    targeted_social: Optional[str] = None

class Candidate(BaseModel):
    id: int
    name: str
    skills: List[str]
    location: str
    rural: bool
    social: str
    experience: str
    past_participation: bool
    has_experience: bool

class MatchRequest(BaseModel):
    internship: Internship
    candidates: List[Candidate]

class JobDescription(BaseModel):
    title: str
    description: str
    required_skills: List[str]
    location: str
    capacity: int = 10  # Default capacity
    quotas: Dict[str, int] = {}  # Default empty quotas
    targeted_social: Optional[str] = None

# ==============================
# API Endpoints
# ==============================
@app.get("/health")
async def health():
    return {"status": "ok", "message": "Server is running"}

@app.post("/submit_job")
async def submit_job(job: JobDescription):
    """
    Submit and store a job description for future matching
    """
    global CURRENT_JOB
    
    # Generate an ID for the job
    job_id = len(os.listdir(JOBS_DIR)) + 1
    
    # Create a full internship object
    internship = {
        "id": job_id,
        "title": job.title,
        "description": job.description,
        "required_skills": job.required_skills,
        "location": job.location,
        "capacity": job.capacity,
        "quotas": job.quotas,
        "targeted_social": job.targeted_social
    }
    
    # Save to disk
    job_filename = f"job_{job_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.json"
    job_path = os.path.join(JOBS_DIR, job_filename)
    
    with open(job_path, "w", encoding="utf-8") as f:
        json.dump(internship, f, indent=2)
    
    # Set as current job
    CURRENT_JOB = internship
    
    return {
        "message": "Job description stored successfully",
        "job_id": job_id,
        "job": internship
    }

@app.get("/current_job")
async def get_current_job():
    """
    Get the current job description
    """
    global CURRENT_JOB
    
    if CURRENT_JOB is None:
        # Try to load the most recent job
        job_files = [f for f in os.listdir(JOBS_DIR) if f.startswith("job_")]
        if job_files:
            # Get the most recent job file
            job_files.sort(reverse=True)
            latest_job = os.path.join(JOBS_DIR, job_files[0])
            
            with open(latest_job, "r", encoding="utf-8") as f:
                CURRENT_JOB = json.load(f)
                
    return {
        "current_job": CURRENT_JOB,
        "message": "No job description set" if CURRENT_JOB is None else "Current job retrieved"
    }

@app.get("/list_jobs")
async def list_jobs():
    """
    List all stored job descriptions
    """
    jobs = []
    
    for filename in os.listdir(JOBS_DIR):
        if filename.startswith("job_"):
            file_path = os.path.join(JOBS_DIR, filename)
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    job = json.load(f)
                    jobs.append(job)
            except Exception as e:
                print(f"[ERROR] Failed to read {filename}: {e}")
    
    return {
        "total_jobs": len(jobs),
        "jobs": jobs
    }

@app.post("/match_from_file")
async def match_from_file(
    file: UploadFile = File(...),
    num_candidates: Optional[int] = Form(None)
):
    """
    Match candidates from file with current job or specified num_candidates
    """
    global CURRENT_JOB
    
    # Save uploaded file
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Decode content as JSON properly
    content_str = content.decode("utf-8")
    data = json.loads(content_str)
    
    # Extract candidates from the uploaded file
    candidates = data.get("candidates", [])
    
    if not candidates:
        return {"error": "No candidates found in the uploaded file."}
    
    # Check if we have a current job
    if CURRENT_JOB is None:
        await get_current_job()  # Try to load the most recent job
        
    if CURRENT_JOB is None:
        return {"error": "No job description set. Please submit a job first."}
    
    # Match candidates with the current job
    result = select_candidates(CURRENT_JOB, candidates, num_candidates)
    return result

@app.get("/list_applicants")
async def list_applicants():
    """
    Returns all applicants from previously uploaded JSON files in UPLOAD_DIR.
    """
    all_candidates = []

    # Iterate over all files in the uploads directory
    for filename in os.listdir(UPLOAD_DIR):
        if filename.endswith(".json"):
            file_path = os.path.join(UPLOAD_DIR, filename)
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    candidates = data.get("candidates", [])
                    all_candidates.extend(candidates)
            except Exception as e:
                print(f"[ERROR] Failed to read {filename}: {e}")

    return {"total_candidates": len(all_candidates), "candidates": all_candidates}

# ==============================
# Run with ngrok in Kaggle
# ==============================
if __name__ == "__main__":
    NGROK_AUTH_TOKEN = "2thd7cCsNZHiMDXtyNVKeifH13C_4DzXDA37X2wXDSbnR93iR"
    NGROK_DOMAIN = "ursula-pseudoviscous-usably.ngrok-free.app"
    ngrok.set_auth_token(NGROK_AUTH_TOKEN)
    public_url = ngrok.connect(addr="8000", proto="http", hostname=NGROK_DOMAIN)
    print(f"[INFO] Public URL: {public_url}")
    uvicorn.run(app, host="0.0.0.0", port=8000)
