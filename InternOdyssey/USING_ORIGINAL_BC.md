# InternOdyssey - Using Original bc.py

This document provides instructions for using the original `bc.py` Python backend with the simplified frontend.

## Setup Instructions

1. Start the Node.js backend and React frontend:
```
start_services.bat
```

2. In a separate terminal, start the original Python backend:
```
start_original_py_backend.bat
```

## JSON Format Required for bc.py

The original `bc.py` requires JSON files to have both `internship` and `candidates` in the same file:

```json
{
  "internship": {
    "id": 1,
    "title": "Data Science Intern",
    "description": "We are looking for a data science intern...",
    "required_skills": ["Python", "Machine Learning", "SQL"],
    "location": "Bangalore",
    "capacity": 5,
    "quotas": {
      "rural_min": 1,
      "SC_min": 1,
      "ST_min": 1
    },
    "targeted_social": "SC"
  },
  "candidates": [
    {
      "id": 1,
      "name": "John Doe",
      "skills": ["Python", "Machine Learning", "SQL"],
      "location": "Bangalore",
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

## Using the Interface

1. Navigate to the "Match Candidates" page using the sidebar
2. Upload a JSON file with both internship and candidates data
3. The system will match candidates based on the criteria in your file
4. View the match results in the table below

## API Endpoints

- `/api/match_from_file` - Upload a JSON file with both internship and candidates data
- `/api/list_applicants` - List all applicants from previously uploaded files