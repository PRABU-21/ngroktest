import os
import subprocess
import uvicorn
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from pyngrok import ngrok

# =============================
# Config
# =============================
UPLOAD_DIR = "uploads"  # directory to store uploaded PDFs
RESUME_PIPELINE = r"resumeocr.py"

# Make sure the upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

# =============================
# FastAPI app
# =============================
app = FastAPI()
from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost:3000",  # React dev server
    # Add any other frontends you need
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # allow these origins
    allow_credentials=True,
    allow_methods=["*"],         # allow all methods (GET, POST, etc)
    allow_headers=["*"],         # allow all headers
)


# Test endpoint
@app.get("/ping")
async def ping():
    return {"message": "pong 🏓"}

# Upload PDF and call resume processing
@app.post("/recommendations")
async def recommend(file: UploadFile = File(...)):
    """
    1. Save uploaded PDF to UPLOAD_DIR
    2. Call resumeocr.py or other functions using the stored file path
    3. Return job recommendations
    """
    try:
        # 1️⃣ Save uploaded PDF
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as f:
            f.write(await file.read())

        print(f"[INFO] PDF saved at: {file_path}")

        # 2️⃣ Call your resume processing function/script
        # If your resumeocr.py accepts a file path argument, pass it
        result = subprocess.run(
            ["python", RESUME_PIPELINE, file_path],  # pass path as argument
            capture_output=True,
            text=True,
            check=True
        )

        # 3️⃣ Return the output as JSON
        return JSONResponse(content={"recommendations": result.stdout})

    except subprocess.CalledProcessError as e:
        return JSONResponse(
            content={
                "error": "Resume pipeline failed",
                "details": e.stderr
            },
            status_code=500
        )

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


# =============================
# Uvicorn + Ngrok launcher
# =============================
if __name__ == "__main__":
    port = 8000
    public_url = ngrok.connect(port)
    print(f"Public URL: {public_url}")
    uvicorn.run(app, host="0.0.0.0", port=port)
