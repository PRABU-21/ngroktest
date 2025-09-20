# main.py
import os
import subprocess
import uvicorn
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pyngrok import ngrok
import json
import re
from pydantic import BaseModel
from industry import match_candidates


# =============================
# Config
# =============================
UPLOAD_DIR = "uploads"
RESUME_PIPELINE = "resumeocr.py"
PARSER_PIPELINE = "parseonlyocr.py"  # <-- new parser script
os.makedirs(UPLOAD_DIR, exist_ok=True)

# =============================
# Ngrok Configuration
# =============================
NGROK_AUTH_TOKEN = "2thd7cCsNZHiMDXtyNVKeifH13C_4DzXDA37X2wXDSbnR93iR"
NGROK_DOMAIN = "ursula-pseudoviscous-usably.ngrok-free.app"

# =============================
# FastAPI app
# =============================
app = FastAPI()

# CORS
origins = [
    "http://localhost:3000",
    "http://localhost:5174",  # Vite dev server
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Test endpoint
# -----------------------------
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
    

# main.py



class JobDescription(BaseModel):
    description: str
    top_k: int = 3

@app.post("/match_candidates")
def match(job: JobDescription):
    results = match_candidates(job.description, top_k=job.top_k)
    return {"job_description": job.description, "matches": results}


# =============================
# Uvicorn + Ngrok
# =============================
if __name__ == "__main__":
    port = 8000
    ngrok.set_auth_token(NGROK_AUTH_TOKEN)

    public_url = ngrok.connect(
        addr=port,
        bind_tls=True,
        domain=NGROK_DOMAIN
    )
    print(f"Public URL: {public_url}")

    uvicorn.run(app, host="0.0.0.0", port=port)
