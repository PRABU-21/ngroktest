# InternOdyssey - Internship Matching System

A system to match candidates with internships using a Python backend with sentence transformers and a React frontend.

## Features

- Upload candidate resumes as JSON files
- Define internship job descriptions with specific skills and requirements
- Match candidates with internships based on multiple criteria
- Store job descriptions for future matching
- Specify how many top candidates to return
- Dashboard for viewing match results
- Social category and rural quota support

## Architecture

- **Frontend**: React with React Router, Axios, and TailwindCSS
- **Backend**: Node.js Express API + Python FastAPI service
- **Matching Algorithm**: Sentence Transformers with hybrid scoring model

## Setup Instructions

### Prerequisites

- Node.js (v14+)
- Python (v3.8+)
- npm or yarn

### Installation

1. Clone the repository
2. Install Node.js dependencies:
```
cd backend
npm install
cd ../frontend
npm install
```

3. Install Python dependencies:
```
pip install fastapi uvicorn python-multipart sentence-transformers pyngrok
```

4. Set up environment variables in `.env` file:
```
PORT=5000
FASTAPI_URL=http://localhost:8000
```

### Running the Application

You can run all services at once using:

```
start_all.bat
```

Or run each service individually:

1. Start Python backend:
```
start_py_backend.bat
```

2. Start Node.js backend:
```
cd backend
npm run dev
```

3. Start React frontend:
```
cd frontend
npm run dev
```

## API Endpoints

### Node.js Backend (http://localhost:5000)

- `POST /api/upload_resumes` - Upload candidate resumes
- `POST /api/match_from_file` - Match candidates from file with current job description
- `POST /api/submit_job` - Submit and store a job description
- `GET /api/current_job` - Get current job description
- `GET /api/list_jobs` - List all stored job descriptions
- `GET /api/list_applicants` - List all applicants from previously uploaded files

### Python FastAPI (http://localhost:8000)

- `POST /match_from_file` - Match candidates from JSON file
- `POST /submit_job` - Store job description
- `GET /current_job` - Get current job description
- `GET /list_jobs` - List all stored job descriptions
- `GET /list_applicants` - List all applicants
- `GET /health` - Health check endpoint

## Data Formats

### Job Description Format

```json
{
  "title": "Software Engineer",
  "description": "We are looking for a software engineer with strong skills in Python and web development...",
  "required_skills": ["Python", "JavaScript", "React"],
  "location": "Bangalore",
  "capacity": 10,
  "quotas": {
    "rural_min": 2,
    "SC_min": 1,
    "ST_min": 1
  },
  "targeted_social": "SC" // Optional
}
```

### Candidates JSON Format

```json
{
  "candidates": [
    {
      "id": 1,
      "name": "John Doe",
      "skills": ["Python", "JavaScript", "React"],
      "location": "Mumbai",
      "rural": false,
      "social": "General",
      "experience": "1 year",
      "past_participation": false,
      "has_experience": false
    },
    // More candidates...
  ]
}
```