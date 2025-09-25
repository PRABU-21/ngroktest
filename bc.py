'''from fastapi import FastAPI, File, UploadFile, Form
from pydantic import BaseModel
from typing import List, Dict
from sentence_transformers import SentenceTransformer, util
import uvicorn
import os
import json
from pyngrok import ngrok
import shutil

# ==============================
# Configurable weights
# ==============================
UPLOAD_DIR = "uploads"
RESUME_PIPELINE = "resumeocr.py"
PARSER_PIPELINE = "parseonlyocr.py"  # <-- new parser script
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
# Upload folder
# ==============================
UPLOAD_DIR = "/kaggle/working/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

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

def select_candidates(internship, candidates):
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
    return {"selected": response, "message": "Selection completed."}

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
    targeted_social: str | None = None

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

# ==============================
# API Endpoints
# ==============================
@app.get("/health")
async def health():
    return {"status": "ok", "message": "Server is running"}

@app.post("/match_internship")
async def match_internship(request: MatchRequest):
    result = select_candidates(request.internship.dict(), [c.dict() for c in request.candidates])
    return result
@app.post("/match_from_file")
async def match_from_file(file: UploadFile = File(...)):
    # Save uploaded file
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Decode content as JSON properly
    content_str = content.decode("utf-8")          # bytes → str
    data = json.loads(content_str)                 # str → dict

    internship = data.get("internship")
    candidates = data.get("candidates")

    if internship is None or candidates is None:
        return {"error": "Invalid JSON. Must contain 'internship' and 'candidates' keys."}

    # Now candidates is a list of dicts
    result = select_candidates(internship, candidates)
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
@app.get("/ping")
async def ping():
    return {"message": "pong 🏓"}

# -----------------------------
# PDF upload & recommendation
# -----------------------------
@app.post("/recommendations")
async def recommend(file: UploadFile = File(...)):
    try:
        # 1️⃣ Read file bytes directly (no saving needed if you don’t want)
        pdf_bytes = await file.read()

        # 2️⃣ Run resumeocr.py and send PDF bytes via stdin
        result = subprocess.run(
            ["python", RESUME_PIPELINE],
            input=pdf_bytes,   # sending file content directly
            capture_output=True,
            text=False         # must be False because input is binary
        )

        # 3️⃣ Decode stdout (since OCR will return text/JSON)
        stdout_text = result.stdout.decode("utf-8", errors="ignore")

        # 4️⃣ Try extracting recommendations JSON
        matches = re.findall(r"\[\{.*\}\]", stdout_text, re.DOTALL)
        if matches:
            recommendations = json.loads(matches[-1])
        else:
            recommendations = {"output": stdout_text, "errors": result.stderr.decode("utf-8")}

        return JSONResponse(content={"recommendations": recommendations})

    except subprocess.CalledProcessError as e:
        return JSONResponse(
            content={"error": "Resume pipeline failed", "details": e.stderr.decode('utf-8')},
            status_code=500
        )
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

# -----------------------------
# PDF upload & parser endpoint
# -----------------------------
# -----------------------------
# PDF upload & parser endpoint
# -----------------------------
@app.post("/parser")
async def parse_pdf(file: UploadFile = File(...)):
    try:
        # 1️⃣ Read PDF bytes directly
        pdf_bytes = await file.read()

        # 2️⃣ Run parseonlyocr.py and pass PDF bytes via stdin
        result = subprocess.run(
            ["python", PARSER_PIPELINE],
            input=pdf_bytes,   # send raw PDF bytes
            capture_output=True,
            text=False         # must be False because input is binary
        )

        # 3️⃣ Decode stdout (parseonlyocr.py should print JSON)
        stdout_text = result.stdout.decode("utf-8", errors="ignore")

        # 4️⃣ Try to extract JSON from stdout
        try:
            parsed_data = json.loads(stdout_text)
        except json.JSONDecodeError:
            parsed_data = {"output": stdout_text, "errors": result.stderr.decode("utf-8", errors="ignore")}

        return JSONResponse(content={"parsed_data": parsed_data})

    except subprocess.CalledProcessError as e:
        return JSONResponse(
            content={"error": "Parser pipeline failed", "details": e.stderr.decode('utf-8', errors='ignore')},
            status_code=500
        )
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

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


'''

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict
from sentence_transformers import SentenceTransformer, util
import uvicorn
import os
import json
from pyngrok import ngrok
import shutil
import subprocess
import re


from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict
from sentence_transformers import SentenceTransformer, util
import uvicorn
import os
import json
from pyngrok import ngrok
import shutil
import subprocess, re

# ==============================
# Configurable weights
# ==============================
UPLOAD_DIR = "uploads"
RESUME_PIPELINE = "resumeocr.py"
PARSER_PIPELINE = "parseonlyocr.py"  # <-- new parser script
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
# Upload folder
# ==============================
UPLOAD_DIR = "/kaggle/working/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

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

def select_candidates(internship, candidates):
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
    return {"selected": response, "message": "Selection completed."}

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
    targeted_social: str | None = None

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

class InternshipRequest(BaseModel):   # <-- New model for custom internship
    internship: Internship

# ==============================
# API Endpoints
# ==============================
@app.get("/health")
async def health():
    return {"status": "ok", "message": "Server is running"}

@app.post("/match_internship")
async def match_internship(request: MatchRequest):
    result = select_candidates(request.internship.dict(), [c.dict() for c in request.candidates])
    return result

@app.post("/match_from_file")
async def match_from_file(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    content_str = content.decode("utf-8")
    data = json.loads(content_str)

    internship = data.get("internship")
    candidates = data.get("candidates")

    if internship is None or candidates is None:
        return {"error": "Invalid JSON. Must contain 'internship' and 'candidates' keys."}

    result = select_candidates(internship, candidates)
    return result

@app.post("/match_custom_internship")
async def match_custom_internship(
    internship_request: InternshipRequest,
    resume_file: UploadFile = File(...)
):
    try:
        contents = await resume_file.read()
        resumes = json.loads(contents.decode("utf-8"))
    except Exception as e:
        return {"error": f"Invalid resume file: {e}"}

    internship = internship_request.internship.dict()
    result = select_candidates(internship, resumes)
    return result

@app.get("/list_applicants")
async def list_applicants():
    all_candidates = []
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

@app.get("/ping")
async def ping():
    return {"message": "pong 🏓"}

# -----------------------------
# PDF upload & recommendation
# -----------------------------
@app.post("/recommendations")
async def recommend(file: UploadFile = File(...)):
    try:
        pdf_bytes = await file.read()
        result = subprocess.run(
            ["python", RESUME_PIPELINE],
            input=pdf_bytes,
            capture_output=True,
            text=False
        )
        stdout_text = result.stdout.decode("utf-8", errors="ignore")
        matches = re.findall(r"\[\{.*\}\]", stdout_text, re.DOTALL)
        if matches:
            recommendations = json.loads(matches[-1])
        else:
            recommendations = {"output": stdout_text, "errors": result.stderr.decode("utf-8")}
        return JSONResponse(content={"recommendations": recommendations})
    except subprocess.CalledProcessError as e:
        return JSONResponse(
            content={"error": "Resume pipeline failed", "details": e.stderr.decode('utf-8')},
            status_code=500
        )
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

# -----------------------------
# PDF upload & parser endpoint
# -----------------------------
@app.post("/parser")
async def parse_pdf(file: UploadFile = File(...)):
    try:
        pdf_bytes = await file.read()
        result = subprocess.run(
            ["python", PARSER_PIPELINE],
            input=pdf_bytes,
            capture_output=True,
            text=False
        )
        stdout_text = result.stdout.decode("utf-8", errors="ignore")
        try:
            parsed_data = json.loads(stdout_text)
        except json.JSONDecodeError:
            parsed_data = {"output": stdout_text, "errors": result.stderr.decode("utf-8", errors="ignore")}
        return JSONResponse(content={"parsed_data": parsed_data})
    except subprocess.CalledProcessError as e:
        return JSONResponse(
            content={"error": "Parser pipeline failed", "details": e.stderr.decode('utf-8', errors='ignore')},
            status_code=500
        )
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

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
