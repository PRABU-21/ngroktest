# industry.py
from sentence_transformers import SentenceTransformer, util
import torch

# Load model globally
model = SentenceTransformer("all-MiniLM-L6-v2")

# Mock user data
users = [
    {
        "name": "PRABAKARAN S B",
        "skills": ["Java", "C", "Python", "JavaScript", "LLM", "Deep Learning", "Machine Learning",
                   "PowerBI", "MongoDB", "Express", "React", "Node.js", "MERN stack", "Tailwind CSS",
                   "HTML", "Prompt Engineering", "OOPs", "JWT authentication", "GitHub", "Docusaurus"],
        "location": "Bangalore",
        "experience": "Intern at ChainAim Technologies",
        "education": "B.Tech AI & DS at Kongu Engineering College",
        "certifications": [
            "MongoDB - Node.js Associate developer",
            "Microsoft Azure Engineer Associate",
            "Intel Unnati Industrial Training 2025"
        ],
        "scores": {"GitHub": 82, "LinkedIn": 78, "Certificates": 85, "Profile": 80}
    },
    {
        "name": "Alice Johnson",
        "skills": ["Python", "Machine Learning", "TensorFlow", "Keras", "SQL", "Data Visualization"],
        "location": "Chennai",
        "experience": "Data Analyst Intern at TCS",
        "education": "B.Sc Computer Science at IIT Madras",
        "certifications": ["Google Data Analytics", "TensorFlow Developer Certificate"],
        "scores": {"GitHub": 65, "LinkedIn": 70, "Certificates": 90, "Profile": 75}
    },
    {
        "name": "Rahul Mehta",
        "skills": ["Java", "Spring Boot", "Microservices", "Kubernetes", "AWS", "SQL"],
        "location": "Hyderabad",
        "experience": "Backend Developer at Infosys",
        "education": "B.Tech IT at Anna University",
        "certifications": ["AWS Certified Solutions Architect", "Oracle Java Professional"],
        "scores": {"GitHub": 75, "LinkedIn": 80, "Certificates": 88, "Profile": 83}
    },
    {
        "name": "Sophia Lee",
        "skills": ["React", "Node.js", "JavaScript", "TypeScript", "Next.js", "UI/UX"],
        "location": "Delhi",
        "experience": "Frontend Engineer at Wipro",
        "education": "B.Tech CSE at NIT Trichy",
        "certifications": ["Meta Frontend Developer", "JavaScript Algorithms (FreeCodeCamp)"],
        "scores": {"GitHub": 90, "LinkedIn": 88, "Certificates": 70, "Profile": 85}
    },
    {
        "name": "Mohammed Ali",
        "skills": ["C++", "DSA", "Competitive Programming", "Problem Solving", "System Design"],
        "location": "Mumbai",
        "experience": "Competitive Programmer, Codeforces Candidate Master",
        "education": "B.E ECE at VIT University",
        "certifications": ["Google Kickstart Finalist", "Codeforces Candidate Master"],
        "scores": {"GitHub": 60, "LinkedIn": 55, "Certificates": 95, "Profile": 72}
    }
]

def profile_to_text(profile):
    return (
        f"Name: {profile['name']}, Skills: {', '.join(profile['skills'])}, "
        f"Location: {profile['location']}, Experience: {profile['experience']}, "
        f"Education: {profile['education']}, Certifications: {', '.join(profile['certifications'])}, "
        f"Scores: GitHub {profile['scores']['GitHub']}, LinkedIn {profile['scores']['LinkedIn']}, "
        f"Certificates {profile['scores']['Certificates']}, Profile {profile['scores']['Profile']}"
    )

def match_candidates(job_description, top_k=3):
    # Convert users to text
    user_texts = [profile_to_text(u) for u in users]
    
    # Embeddings
    requirement_embedding = model.encode(job_description, convert_to_tensor=True)
    user_embeddings = model.encode(user_texts, convert_to_tensor=True)
    
    # Compute similarities
    similarities = util.pytorch_cos_sim(requirement_embedding, user_embeddings)[0]
    top_results = torch.topk(similarities, k=top_k)
    
    # Build detailed output
    results = []
    for idx, score in zip(top_results[1], top_results[0]):
        user = users[idx]
        matched_skills = [s for s in user['skills'] if s.lower() in job_description.lower()]
        matched_location = user['location'] if user['location'].lower() in job_description.lower() else None
        matched_experience = user['experience'] if any(word.lower() in job_description.lower() for word in user['experience'].split()) else None
        
        results.append({
            "name": user['name'],
            "score": float(score),
            "matched_skills": matched_skills,
            "matched_location": matched_location,
            "matched_experience": matched_experience,
            "skills": user['skills'],
            "location": user['location'],
            "experience": user['experience'],
            "certifications": user['certifications']
        })
    
    return results
