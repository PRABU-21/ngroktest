from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict
from sentence_transformers import SentenceTransformer, util
import uvicorn
import os
import json
from pyngrok import ngrok
import subprocess
import re

# ==============================
# Configurable weights
# ==============================
UPLOAD_DIR = "uploads"
RESUME_PIPELINE = "resumeocr.py"
PARSER_PIPELINE = "parseonlyocr.py"
os.makedirs(UPLOAD_DIR, exist_ok=True)

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
# Helper functions
# ==============================
def profile_to_text(profile):
    parts = [
        f"Name: {profile['name']}",
        f"Education: {profile.get('education','')}",
        f"Skills: {', '.join(profile['skills'])}",
        f"Experience: {', '.join(profile.get('experience',[])) if isinstance(profile.get('experience'), list) else profile.get('experience','')}",
        f"Objective: {profile.get('objective','')}"
    ]
    project_texts = [f"{p['title']}: {p['description']}" for p in profile.get('projects',[])]
    if project_texts:
        parts.append("Projects: " + " | ".join(project_texts))
    if profile.get('certifications'):
        parts.append("Certifications: " + ", ".join(profile['certifications']))
    return ". ".join(parts)

def skills_match_fraction(candidate_skills, req_skills):
    return sum(1 for s in req_skills if s in candidate_skills) / len(req_skills)

def location_score(candidate_loc, req_loc):
    return 1.0 if candidate_loc.strip().lower() == req_loc.strip().lower() else 0.0

def experience_score(candidate_exp):
    if not candidate_exp:
        return 1.0
    exp_text = " ".join(candidate_exp) if isinstance(candidate_exp, list) else candidate_exp
    exp_text = exp_text.lower()
    if "fresher" in exp_text or "months" in exp_text:
        return 1.0
    if "1 year" in exp_text:
        return 0.9
    if "2 year" in exp_text:
        return 0.6
    if "research" in exp_text:
        return 0.8
    return 0.5

def compute_hybrid_score(cand, intern_emb, cand_emb, internship):
    skill_frac = skills_match_fraction(cand['skills'], internship['required_skills'])
    sem_sim = util.pytorch_cos_sim(cand_emb, intern_emb).item()
    loc = location_score(cand['location'], internship['location'])
    exp = experience_score(cand.get('experience', []))
    base = (
        WEIGHTS['skill'] * skill_frac
        + WEIGHTS['semantic'] * sem_sim
        + WEIGHTS['location'] * loc
        + WEIGHTS['experience'] * exp
    )
    adj = 0.0
    if cand.get('rural', False):
        adj += RURAL_BONUS
    adj += SOCIAL_BONUS.get(cand.get('social', 'General'), 0.0)
    if cand.get('past_participation', False):
        adj -= PAST_PARTICIPATION_PENALTY
    if internship.get('targeted_social') and cand.get('social') == internship['targeted_social']:
        adj += 0.06
    final_score = max(0.0, base + adj)
    breakdown = {
        "skill_frac": skill_frac,
        "semantic_sim": sem_sim,
        "location": loc,
        "experience": exp,
        "social_bonus": SOCIAL_BONUS.get(cand.get('social', 'General'), 0.0),
        "rural_bonus": RURAL_BONUS if cand.get('rural', False) else 0.0,
        "past_penalty": PAST_PARTICIPATION_PENALTY if cand.get('past_participation', False) else 0.0,
        "final_score": final_score
    }
    return final_score, breakdown

def select_candidates(internship, candidates):
    filtered_candidates = [c for c in candidates if not c.get("experience")]
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

    candidates_sorted = sorted(
        zip(filtered_candidates, scores_breakdowns),
        key=lambda x: x[1][0],
        reverse=True
    )

    capacity = internship['capacity']
    selected = []
    for cand, (score, breakdown) in candidates_sorted[:capacity]:
        selected.append({
            "id": cand["id"],
            "name": cand["name"],
            "skills": cand["skills"],
            "location": cand.get("location", "Unknown"),
            "experience": cand.get("experience", []),
            "social": cand.get("social", "General"),
            "rural": cand.get("rural", False),
            "past_participation": cand.get("past_participation", False),
            "final_score": breakdown["final_score"],
            "breakdown": breakdown
        })
    return {"selected": selected, "message": "Selection completed."}

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
    quotas: Dict[str, int] = {}
    targeted_social: str | None = None

class Candidate(BaseModel):
    id: int
    name: str
    skills: List[str]
    location: str
    rural: bool = False
    social: str = "General"
    experience: List[str] = []
    past_participation: bool = False

class MatchRequest(BaseModel):
    internship: Internship
    candidates: List[Candidate]

# ==============================
# API Endpoints
# ==============================
@app.get("/health")
async def health():
    return {"status": "ok", "message": "Server is running"}

# ✅ Single match endpoint
@app.post("/match")
async def match(request: MatchRequest = None, file: UploadFile = File(None)):
    if file:  # If JSON file is uploaded
        content = await file.read()
        data = json.loads(content.decode("utf-8"))
        internship = data.get("internship")
        candidates = data.get("candidates")
    else:  # If JSON body is sent
        internship = request.internship.dict()
        candidates = [c.dict() for c in request.candidates]

    if not internship or not candidates:
        return {"error": "Invalid data. Provide internship and candidates."}

    return select_candidates(internship, candidates)

# Ping endpoint
@app.get("/ping")
async def ping():
    return {"message": "pong 🏓"}

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
