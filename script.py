from sentence_transformers import SentenceTransformer, util
import json
import os

# -------------------------------
# 1. Load or download model
# -------------------------------

MODEL_PATH = "./models/all-mpnet-base-v2"

if os.path.exists(MODEL_PATH):
    print("[INFO] Loading model from local disk...")
    model = SentenceTransformer(MODEL_PATH)
else:
    print("[INFO] Downloading model...")
    model = SentenceTransformer("all-mpnet-base-v2")
    model.save(MODEL_PATH)
print("[INFO] Model ready.")

# -------------------------------
# 2. Load user profile
# -------------------------------
with open("parsed_resume.json", "r", encoding="utf-8") as f:
    user_profile = json.load(f)  # Load as Python dict

# Convert dict to string for embedding
user_profile_text = json.dumps(user_profile, indent=2)
print("[INFO] User profile ready.")

# -------------------------------
# 3. Define job postings
# -------------------------------
jobs = [
    {"job_id": 101, "title": "Business Analyst", "desc": "Assist in gathering and analyzing business requirements. Work with cross-functional teams to prepare reports and dashboards. Strong SQL and Excel skills are required to analyze business data, generate insights, and support decision-making processes."},
    {"job_id": 102, "title": "Data Analyst", "desc": "Work on analyzing structured and unstructured datasets. Create dashboards and visualizations using Tableau. Requires SQL expertise for database querying and reporting. Internship is based in Bangalore, with opportunities for hands-on business problem-solving."},
    {"job_id": 103, "title": "Machine Learning Engineer", "desc": "Develop, train, and deploy machine learning models for real-world applications. Strong experience in Python programming and libraries such as TensorFlow and PyTorch is expected. Knowledge of deep learning architectures and model optimization is preferred."},
    {"job_id": 104, "title": "Frontend Developer", "desc": "Work with UI/UX designers to build interactive, user-friendly web applications. Proficiency in React and JavaScript is required. Responsibilities include developing reusable components, implementing responsive design, and optimizing performance for web applications."},
    {"job_id": 201, "title": "Data Science Intern", "desc": "Support data-driven projects by collecting, cleaning, and analyzing datasets. Requires proficiency in Python, R, and SQL. Intern will experiment with machine learning algorithms and create visualizations to interpret data. Candidates should be pursuing B.Tech/M.Tech in Computer Science, Data Science, or Statistics."},
    {"job_id": 202, "title": "Frontend Developer Intern", "desc": "Assist in building and maintaining responsive web interfaces. Hands-on coding with HTML, CSS, JavaScript, and React. Gain experience in collaborative projects using GitHub. Requires an understanding of responsive layouts and ability to work in a team environment."},
    {"job_id": 203, "title": "Digital Marketing Intern", "desc": "Work on SEO strategies, Google Analytics, and social media campaigns to improve brand visibility. Responsibilities include creating content, running A/B tests, and analyzing campaign performance. Good writing, communication skills, and creativity are essential."},
    {"job_id": 204, "title": "Financial Analyst Intern", "desc": "Assist in preparing financial models and reports. Work closely with the finance team to interpret data and support decision-making. Strong Excel skills and an analytical mindset are required. Attention to detail and accuracy in reporting are critical for success."},
    {"job_id": 205, "title": "Software Development Intern", "desc": "Participate in full-stack software development projects. Hands-on coding in Java, Python, or C++. Exposure to web frameworks, APIs, and debugging techniques. Collaborate with senior developers to build scalable applications and learn industry-standard practices."},
    {"job_id": 206, "title": "UI/UX Design Intern", "desc": "Assist in creating wireframes, prototypes, and final designs for web/mobile applications. Experience with design tools such as Figma, Adobe XD, or Sketch is required. Understand user-centered design principles and collaborate with developers for implementation."},
    {"job_id": 207, "title": "Content Writing Intern", "desc": "Write and edit blog posts, articles, and web content. Learn to optimize content for SEO and publish across platforms. Creativity, strong grammar, and ability to meet deadlines are required. Journalism, Communications, or English background preferred."},
    {"job_id": 208, "title": "AI Research Intern", "desc": "Work on cutting-edge AI projects focusing on Natural Language Processing (NLP) and Large Language Models (LLMs). Responsibilities include reading research papers, implementing ML/DL models, and running experiments. Strong Python and deep learning knowledge is essential."},
    {"job_id": 209, "title": "Cloud & DevOps Intern", "desc": "Gain hands-on experience in cloud platforms (AWS/Azure/GCP). Work with Docker, CI/CD pipelines, and deployment workflows. Learn infrastructure automation and application monitoring. Basic Linux and scripting knowledge will be highly beneficial."}
]

print(f"[INFO] Loaded {len(jobs)} jobs.")

# -------------------------------
# 4. Encode user and jobs
# -------------------------------
print("[INFO] Encoding user profile...")
user_embedding = model.encode(user_profile_text, convert_to_tensor=True)
print("[INFO] Encoding job descriptions...")
job_embeddings = model.encode([job["desc"] for job in jobs], convert_to_tensor=True)

# -------------------------------
# 5. Compute similarity and rank
# -------------------------------
print("[INFO] Calculating similarity scores...")
cosine_scores = util.pytorch_cos_sim(user_embedding, job_embeddings)

ranked_jobs = sorted(
    zip(jobs, cosine_scores[0]),
    key=lambda x: float(x[1]),
    reverse=True
)


top_5 = []
for job, score in ranked_jobs[:5]:
    confidence = ((float(score) + 1) / 2) * 100
    top_5.append({
        "job_id": job["job_id"],
        "title": job["title"],
        "confidence": round(confidence, 2)
    })

# Print as JSON so your FastAPI subprocess can capture it
print(json.dumps(top_5))



