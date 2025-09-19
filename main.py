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
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as f:
            f.write(await file.read())
        print(f"[INFO] PDF saved at: {file_path}")

        result = subprocess.run(
            ["python", RESUME_PIPELINE, file_path],
            capture_output=True,
            text=True
        )

        matches = re.findall(r"\[\{.*\}\]", result.stdout, re.DOTALL)
        if matches:
            recommendations = json.loads(matches[-1])
        else:
            recommendations = {"output": result.stdout, "errors": result.stderr}

        return JSONResponse(content={"recommendations": recommendations})

    except subprocess.CalledProcessError as e:
        return JSONResponse(
            content={"error": "Resume pipeline failed", "details": e.stderr},
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
        # 1️⃣ Save uploaded PDF
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as f:
            f.write(await file.read())
        print(f"[INFO] PDF saved at: {file_path}")

        # 2️⃣ Run parseonlyocr.py and capture output JSON file
        result = subprocess.run(
            ["python", PARSER_PIPELINE, file_path],
            capture_output=True,
            text=True
        )

        # 3️⃣ Load the generated JSON file
        parsed_json_file = os.path.join(os.getcwd(), "parsed_resume_only.json")
        if os.path.exists(parsed_json_file):
            with open(parsed_json_file, "r", encoding="utf-8") as f:
                parsed_data = json.load(f)
        else:
            parsed_data = {"error": "Parsed JSON file not found", "stdout": result.stdout, "stderr": result.stderr}

        return JSONResponse(content={"parsed_data": parsed_data})

    except subprocess.CalledProcessError as e:
        return JSONResponse(
            content={"error": "Parser pipeline failed", "details": e.stderr},
            status_code=500
        )
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

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
