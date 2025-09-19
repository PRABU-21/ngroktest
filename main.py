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

# =============================
# Config
# =============================
UPLOAD_DIR = "uploads"
RESUME_PIPELINE = "resumeocr.py"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# =============================
# Ngrok Configuration (Placeholders)
# =============================
NGROK_AUTH_TOKEN = "2thd7cCsNZHiMDXtyNVKeifH13C_4DzXDA37X2wXDSbnR93iR"           # <-- Replace with your ngrok auth token
NGROK_DOMAIN = "ursula-pseudoviscous-usably.ngrok-free.app"       # <-- Replace with your reserved free static domain

# =============================
# FastAPI app
# =============================
app = FastAPI()

# CORS
origins = [
    "http://localhost:3000",  # React dev server
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
        # Save uploaded PDF
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as f:
            f.write(await file.read())
        print(f"[INFO] PDF saved at: {file_path}")

        # Run resumeocr.py and capture stdout
        result = subprocess.run(
            ["python", RESUME_PIPELINE, file_path],
            capture_output=True,
            text=True
        )

        # Extract JSON array from stdout
        matches = re.findall(r"\[\{.*\}\]", result.stdout, re.DOTALL)
        if matches:
            recommendations = json.loads(matches[-1])
        else:
            # If JSON not found, return raw output
            recommendations = {"output": result.stdout, "errors": result.stderr}

        return JSONResponse(content={"recommendations": recommendations})

    except subprocess.CalledProcessError as e:
        return JSONResponse(
            content={"error": "Resume pipeline failed", "details": e.stderr},
            status_code=500
        )
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

# =============================
# Uvicorn + Ngrok
# =============================
if __name__ == "__main__":
    port = 8000

    # Set ngrok auth token
    ngrok.set_auth_token(NGROK_AUTH_TOKEN)

    # Connect to ngrok with reserved static domain
    public_url = ngrok.connect(
        addr=port,
        bind_tls=True,
        domain=NGROK_DOMAIN
    )
    print(f"Public URL: {public_url}")

    uvicorn.run(app, host="0.0.0.0", port=port)
