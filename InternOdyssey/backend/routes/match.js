const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage config for JSON files
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (_req, file, cb) {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const jsonFileFilter = (_req, file, cb) => {
  const isJson =
    file.mimetype === "application/json" || file.originalname.toLowerCase().endsWith(".json");
  if (!isJson) {
    return cb(new Error("Only JSON files are allowed"));
  }
  cb(null, true);
};

const upload = multer({ storage, fileFilter: jsonFileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

const getFastApiBaseUrl = () => {
  return process.env.FASTAPI_URL || process.env.NGROK_URL;
};

// 1) Upload Resume JSON
// Endpoint: POST /api/upload_resumes
router.post("/upload_resumes", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded. Use field name 'file'." });
    }

    const filePath = req.file.path;
    const raw = fs.readFileSync(filePath, "utf8");
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return res.status(400).json({ message: "Uploaded file is not valid JSON" });
    }

    return res.status(200).json({
      message: "File uploaded successfully",
      filename: path.basename(filePath),
      parsed,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Upload failed" });
  }
});

// 2) Match From File
// Endpoint: POST /api/match_from_file
router.post("/match_from_file", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded. Use field name 'file'." });
    }

    const baseUrl = getFastApiBaseUrl();
    if (!baseUrl) {
      return res.status(500).json({ message: "FASTAPI_URL or NGROK_URL is not configured" });
    }

    // Forward the file as multipart/form-data field 'file' to FastAPI
    const form = new FormData();
    const fileStream = fs.createReadStream(req.file.path);
    form.append("file", fileStream, {
      filename: req.file.originalname || path.basename(req.file.path),
      contentType: "application/json",
    });
    
    // Add num_candidates parameter if provided
    if (req.body.num_candidates) {
      form.append("num_candidates", req.body.num_candidates);
    }

    const url = `${baseUrl.replace(/\/$/, "")}/match_from_file`;
    const response = await axios.post(url, form, {
      headers: form.getHeaders(),
      timeout: 60000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    return res.status(200).json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data || { message: err.message || "Match from file failed" };
    return res.status(status).json(message);
  }
});

// 3) Match Internship (Manual JSON)
// Endpoint: POST /api/match_internship
router.post("/match_internship", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ message: "Invalid JSON payload" });
    }

    const baseUrl = getFastApiBaseUrl();
    if (!baseUrl) {
      return res.status(500).json({ message: "FASTAPI_URL or NGROK_URL is not configured" });
    }

    const url = `${baseUrl.replace(/\/$/, "")}/match_internship`;
    const response = await axios.post(url, payload, { timeout: 30000 });
    return res.status(200).json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data || { message: err.message || "Match internship failed" };
    return res.status(status).json(message);
  }
});

// These endpoints are not available in the original bc.py
// Keeping the file structure simple for the original backend

module.exports = router;
// Health proxy: GET /api/health -> FastAPI /health
router.get("/health", async (_req, res) => {
  try {
    const baseUrl = getFastApiBaseUrl();
    if (!baseUrl) {
      return res.status(200).json({ node: "ok", fastapi: "not_configured" });
    }
    const url = `${baseUrl.replace(/\/$/, "")}/health`;
    const response = await axios.get(url, { timeout: 10000 });
    return res.status(200).json({ node: "ok", fastapi: response.data });
  } catch (err) {
    return res.status(200).json({ node: "ok", fastapi: { status: "unreachable", error: err.message } });
  }
});

// List applicants proxy: GET /api/list_applicants -> FastAPI /list_applicants
router.get("/list_applicants", async (_req, res) => {
  try {
    const baseUrl = getFastApiBaseUrl();
    if (!baseUrl) {
      return res.status(500).json({ message: "FASTAPI_URL or NGROK_URL is not configured" });
    }
    const url = `${baseUrl.replace(/\/$/, "")}/list_applicants`;
    const response = await axios.get(url, { timeout: 30000 });
    return res.status(200).json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data || { message: err.message || "Failed to list applicants" };
    return res.status(status).json(message);
  }
});


