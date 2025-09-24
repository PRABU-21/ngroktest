from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer, util
import json
import nest_asyncio
import uvicorn

nest_asyncio.apply()

# -----------------------
# Load model once (global)
# -----------------------
print("[INFO] Loading embedding model...")
model = SentenceTransformer("all-MiniLM-L6-v2")
print("[INFO] Model loaded successfully.")

# -----------------------
# Configurable weights
# -----------------------
WEIGHTS = {"skill": 0.5, "semantic": 0.3, "location": 0.1, "experience": 0.1}
RURAL_BONUS = 0.1
SOCIAL_BONUS = {"SC": 0.08, "ST": 0.1, "OBC": 0.05, "General": 0.0}
PAST_PARTICIPATION_PENALTY = 0.15

app = FastAPI()

# -----------------------
# Helper functions
# -----------------------
def profile_to_text(profile):
    return f"Name: {profile['name']}. Skills: {', '.join(profile['skills'])}. Location: {profile['location']}. Experience: {profile['experience']}."

def skills_match_fraction(candidate_skills, req_skills):
    return sum(1 for s in req_skills if s in candidate_skills) / len(req_skills)

def location_score(candidate_loc, req_loc):
    return 1.0 if candidate_loc.strip().lower() == req_loc.strip().lower() else 0.0

def experience_score(candidate_exp):
    if "fresher" in candidate_exp.lower() or "months" in candidate_exp.lower():
        return 1.0
    if "1 year" in candidate_exp:
        return 0.9
    if "2 year" in candidate_exp:
        return 0.6
    if "research" in candidate_exp.lower():
        return 0.8
    return 0.5

def compute_hybrid_score(cand, internship, intern_emb, cand_emb):
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
    if internship.get('targeted_social') and cand['social']==internship['targeted_social']:
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

# -----------------------
# Health endpoint
# -----------------------
@app.get("/health")
def health():
    return {"status": "ok"}

# -----------------------
# Matchmaking endpoint
# -----------------------
@app.post("/match_internship")
async def match_internship(file: UploadFile = File(...)):
    data = json.load(file.file)
    internship = data['internship']
    candidates = data['candidates']

    # Keep only freshers
    filtered_candidates = [c for c in candidates if not c.get("has_experience", False)]

    # Encode embeddings
    candidate_texts = [profile_to_text(c) for c in filtered_candidates]
    intern_text = internship['description']
    candidate_embeddings = model.encode(candidate_texts, convert_to_tensor=True)
    intern_embedding = model.encode(intern_text, convert_to_tensor=True)

    # Compute scores
    scores_breakdowns = [compute_hybrid_score(c, internship, intern_embedding, ce) for c, ce in zip(filtered_candidates, candidate_embeddings)]
    
    all_candidates = []
    for cand, (score, bd) in zip(filtered_candidates, scores_breakdowns):
        cand_copy = cand.copy()
        cand_copy['final_score'] = score
        cand_copy['breakdown'] = bd
        all_candidates.append(cand_copy)

    # Quota-aware selection
    selected = []
    capacity = internship['capacity']

    # Rural quota
    rural_needed = internship['quotas'].get('rural_min',0)
    rural_candidates = [(c, s, bd) for (c,(s,bd)) in zip(filtered_candidates, scores_breakdowns) if c['rural']]
    rural_candidates.sort(key=lambda x:x[1],reverse=True)
    for c,s,bd in rural_candidates[:rural_needed]:
        selected.append({**c, "final_score": s, "breakdown": bd})
        capacity-=1

    # SC/ST quotas
    for cat_key, quota_key in [('SC','SC_min'), ('ST','ST_min')]:
        cat_needed = internship['quotas'].get(quota_key,0)
        cat_candidates = [(c,s,bd) for (c,s,bd) in zip(filtered_candidates,[s for s,_ in scores_breakdowns],[bd for _,bd in scores_breakdowns]) if c['social']==cat_key and {**c, "final_score": s} not in selected]
        cat_candidates.sort(key=lambda x:x[1],reverse=True)
        for c,s,bd in cat_candidates[:cat_needed]:
            if capacity>0:
                selected.append({**c, "final_score": s, "breakdown": bd})
                capacity-=1

    # Remaining best
    remaining = [(c,s,bd) for (c,s,bd) in zip(filtered_candidates,[s for s,_ in scores_breakdowns],[bd for _,bd in scores_breakdowns]) if {**c, "final_score": s} not in selected]
    remaining.sort(key=lambda x:x[1],reverse=True)
    for c,s,bd in remaining[:capacity]:
        selected.append({**c, "final_score": s, "breakdown": bd})

    return JSONResponse({"all_candidates": all_candidates, "selected": selected, "message": "Selection completed."})

# -----------------------
# Run server
# -----------------------
if __name__ == "__main__":
    import nest_asyncio
    nest_asyncio.apply()
    uvicorn.run(app, host="0.0.0.0", port=8000)
