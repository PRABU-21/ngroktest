# main.py
import os
import subprocess
import uvicorn
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pyngrok import ngrok
import json

# =============================
# Config
# =============================
UPLOAD_DIR = "uploads"
RESUME_PIPELINE = "resumeocr.py"
os.makedirs(UPLOAD_DIR, exist_ok=True)

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
        # Save PDF
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as f:
            f.write(await file.read())
        print(f"[INFO] PDF saved at: {file_path}")

        # Run resumeocr.py and capture everything
        result = subprocess.run(
            ["python", RESUME_PIPELINE, file_path],
            capture_output=True,
            text=True
        )

        matches = re.findall(r"\[\{.*\}\]", result.stdout, re.DOTALL)
        if matches:
            recommendations = json.loads(matches[-1])
        else:
            recommendations = []

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
    public_url = ngrok.connect(port)
    print(f"Public URL: {public_url}")
    uvicorn.run(app, host="0.0.0.0", port=port)
