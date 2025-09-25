# InternOdyssey Dashboard

## Overview
InternOdyssey is a comprehensive dashboard application that helps match candidates to internship positions. The application allows users to:

1. Upload resume data files (JSON format)
2. Match candidates from files against internship positions
3. View all applicants and selected candidates in an organized table format
4. See detailed information about each applicant

## Features

### Unified Dashboard
The application now features a consolidated dashboard with three main tabs:
- **Upload Resume**: Upload JSON files containing resume data
- **Match Candidates**: Match stored resumes or new files against internship criteria
- **View Applicants**: View all applicants and selected candidates in a table format

### Resume Storage
- Upload and store resume data for later matching
- View a list of all stored resumes with upload dates
- Choose stored resumes for matching

### Candidate Matching
- Match candidates from stored resumes
- Match candidates from new JSON files
- View match results with detailed scoring

### Applicant Management
- View all applicants in a table format
- View selected candidates in a table format
- Filter between all applicants and selected candidates
- See detailed information about each applicant including skills, location, experience, and demographics

## How to Use

### 1. Upload Resume
- Click on the "Upload Resume" tab
- Select a JSON file containing resume data
- Click "Upload Resume"
- View the parsed data and confirm it looks correct
- The resume will be stored for later matching

### 2. Match Candidates
- Click on the "Match Candidates" tab
- Choose either a stored resume or upload a new file
- Click "Match Selected Resume" or "Match Candidates"
- View the match results with scores for each candidate
- Matched candidates are automatically added to the selected candidates list

### 3. View Applicants
- Click on the "View Applicants" tab
- Switch between "All Applicants" and "Selected Candidates" views
- Click "Details" for any applicant to see complete information
- For selected candidates, view the score breakdown

## Technical Details

### API Endpoints
- `/upload_resumes`: Upload resume data
- `/match_from_file`: Match candidates from a file
- `/match_internship`: Match candidates from manually entered JSON data (not used in current version)
- `/list_applicants`: Get a list of all applicants

### State Management
- Resume data is stored in the dashboard component state
- Selected candidates are stored in the App component state for global access
- Applicant details are fetched from the API when needed

## Getting Started

1. Ensure the backend server is running
2. Install dependencies with `npm install`
3. Start the application with `npm run dev`
4. Access the dashboard at http://localhost:5173/
