!pip install flask pyngrok && \
ngrok config add-authtoken 2thd7cCsNZHiMDXtyNVKeifH13C_4DzXDA37X2wXDSbnR93iR && \
python - <<'EOF'

# main.py
import subprocess
import uvicorn
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from pyngrok import ngrok

# =============================
# Config
# =============================
PDF_PATH = "resume.pdf"
RESUME_PIPELINE = r"resumeocr.py"

# =============================
# FastAPI app
# =============================
app = FastAPI()
@app.get("/ping")
async def ping():
    """
    Simple test endpoint to verify server is running
    """
    return {"message": "pong 🏓"}


@app.post("/recommendations")
async def recommend(file: UploadFile = File(...)):
    """
    Upload resume (PDF) -> run resumeocr.py -> return job recommendations
    """
    try:
        # Step 1: Save uploaded PDF
        with open(PDF_PATH, "wb") as f:
            f.write(await file.read())

        # Step 2: Call resumeocr.py and capture output
        result = subprocess.run(
            ["python", RESUME_PIPELINE],
            capture_output=True,
            text=True,
            check=True
        )

        # Step 3: Return its stdout (recommendations) as JSON
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
