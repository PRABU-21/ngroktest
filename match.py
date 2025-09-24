# -------------------------
# FastAPI backend for internship matching
# -------------------------
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from sentence_transformers import SentenceTransformer, util
import json
import nest_asyncio
import uvicorn

# -------------------------
# Config
# -------------------------
WEIGHTS = {"skill": 0.5, "semantic": 0.3, "location": 0.1, "experience": 0.1}
RURAL_BONUS = 0.1
SOCIAL_BONUS = {"SC": 0.08, "ST": 0.1, "OBC": 0.05, "General": 0.0}
PAST_PARTICIPATION_PENALTY = 0.15

# -------------------------
# Models
# -------------------------
class Internship(BaseModel):
    id: int
    title: str
    description: str
    required_skills: List[str]
    location: str
    capacity: int
    quotas: dict
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

# -------------------------
# Initialize app
# -------------------------
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# -------------------------
# Load model once
# -------------------------
print("[INFO] Loading embedding model...")
model = SentenceTransformer("all-MiniLM-L6-v2")
print("[INFO] Model loaded successfully.")

# -------------------------
# Helper functions
# -------------------------
def profile_to_text(profile):
    return f"Name: {profile['name']}. Skills: {', '.join(profile['skills'])}. Location: {profile['location']}. Experience: {profile['experience']}."

def skills_match_fraction(candidate_skills, req_skills):
    return sum(1 for s in req_skills if s in candidate_skills) / len(req_skills)

def location_score(candidate_loc, req_loc):
    return 1.0 if candidate_loc.strip().lower() == req_loc.strip().lower() else 0.0

def experience_score(candidate_exp):
    candidate_exp = candidate_exp.lower()
    if "fresher" in candidate_exp or "months" in candidate_exp:
        return 1.0
    if "1 year" in candidate_exp:
        return 0.9
    if "2 year" in candidate_exp:
        return 0.6
    if "research" in candidate_exp:
        return 0.8
    return 0.5

def compute_hybrid_score(cand, intern_emb, cand_emb):
    skill_frac = skills_match_fraction(cand['skills'], internship['required_skills'])
    sem_sim = util.pytorch_cos_sim(cand_emb, intern_emb).item()
    loc = location_score(cand['location'], internship['location'])
    exp = experience_score(cand['experience'])
    base = (WEIGHTS['skill']*skill_frac + WEIGHTS['semantic']*sem_sim + WEIGHTS['location']*loc + WEIGHTS['experience']*exp)
    adj = 0.0
    if cand['rural']:
        adj += RURAL_BONUS
    adj += SOCIAL_BONUS.get(cand['social'],0.0)
    if cand['past_participation']:
        adj -= PAST_PARTICIPATION_PENALTY
    if internship['targeted_social'] and cand['social']==internship['targeted_social']:
        adj += 0.06
    final_score = max(0.0, base+adj)
    breakdown = {
        "skill_frac": skill_frac,
        "semantic_sim": sem_sim,
        "location": loc,
        "experience": exp,
        "social_bonus": SOCIAL_BONUS.get(cand['social'],0.0),
        "rural_bonus": RURAL_BONUS if cand['rural'] else 0.0,
        "past_penalty": PAST_PARTICIPATION_PENALTY if cand['past_participation'] else 0.0,
        "final_score": final_score
    }
    return final_score, breakdown

# -------------------------
# Health endpoint
# -------------------------
@app.get("/health")
def health():
    return {"status": "ok"}

# -------------------------
# Matchmaking endpoint (with uploaded JSON)
# -------------------------
@app.post("/match_internship")
async def match_internship(internship: Internship, candidates_file: UploadFile = File(...)):
    try:
        candidates_data = json.load(candidates_file.file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON file: {str(e)}")

    # Filter freshers
    filtered_candidates = [c for c in candidates_data if not c.get("has_experience", False)]

    # Encode embeddings
    candidate_texts = [profile_to_text(c) for c in filtered_candidates]
    intern_text = internship.description
    candidate_embeddings = model.encode(candidate_texts, convert_to_tensor=True)
    intern_embedding = model.encode(intern_text, convert_to_tensor=True)

    # Compute scores
    scores_breakdowns = [compute_hybrid_score(c, intern_embedding, ce) for c, ce in zip(filtered_candidates, candidate_embeddings)]

    # Attach scores to candidates
    all_candidates_with_scores = []
    for c, (score, bd) in zip(filtered_candidates, scores_breakdowns):
        c_copy = c.copy()
        c_copy["final_score"] = score
        c_copy["breakdown"] = bd
        all_candidates_with_scores.append(c_copy)

    # Quota-aware selection
    selected = []
    capacity = internship.capacity

    # Rural quota
    rural_needed = internship.quotas.get('rural_min',0)
    rural_candidates = [(c, c['final_score'], c['breakdown']) for c in all_candidates_with_scores if c['rural']]
    rural_candidates.sort(key=lambda x:x[1], reverse=True)
    for c,s,bd in rural_candidates[:rural_needed]:
        selected.append(c)
        capacity-=1

    # SC/ST quotas
    for cat_key, quota_key in [('SC','SC_min'), ('ST','ST_min')]:
        cat_needed = internship.quotas.get(quota_key,0)
        cat_candidates = [c for c in all_candidates_with_scores if c['social']==cat_key and c not in selected]
        cat_candidates.sort(key=lambda x:x['final_score'], reverse=True)
        for c in cat_candidates[:cat_needed]:
            if capacity>0:
                selected.append(c)
                capacity-=1

    # Remaining best
    remaining = [c for c in all_candidates_with_scores if c not in selected]
    remaining.sort(key=lambda x:x['final_score'], reverse=True)
    for c in remaining[:capacity]:
        selected.append(c)

    return {"all_candidates": all_candidates_with_scores, "selected": selected, "message": "Selection completed."}

# -------------------------
# Ngrok placeholders
# -------------------------
NGROK_AUTH_TOKEN = "2thd7cCsNZHiMDXtyNVKeifH13C_4DzXDA37X2wXDSbnR93iR"
NGROK_DOMAIN = "ursula-pseudoviscous-usably.ngrok-free.app"

# -------------------------
# Run app in notebook
# -------------------------
if __name__ == "__main__":
    import nest_asyncio
    from pyngrok import ngrok

    nest_asyncio.apply()
    ngrok.kill()  # Kill any old tunnels

    # Set auth token (optional)
    # ngrok.set_auth_token(NGROK_AUTH_TOKEN)

    public_url = ngrok.connect(8000, "http")  # for free plan, random subdomain
    print("[INFO] Public URL:", public_url)

    uvicorn.run(app, host="0.0.0.0", port=8000)
