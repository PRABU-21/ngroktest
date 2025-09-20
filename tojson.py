'''import os
import re
import json
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
API_KEY = os.getenv("PARSE_API")  # Your Gemini API key
genai.configure(api_key=API_KEY)

# File path of the resume
RESUME_FILE = r"resume_extracted.txt"

def read_resume(file_path):
    """Read resume content from a text file."""
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()

def clean_json_text(raw_text):
    """
    Remove any markdown/backticks or extra characters so it can be parsed as JSON.
    """
    # Remove triple backticks and language hints (```json)
    cleaned = re.sub(r"```(?:json)?", "", raw_text, flags=re.IGNORECASE)
    # Strip leading/trailing whitespace
    cleaned = cleaned.strip()
    return cleaned

def parse_resume_with_gemini(resume_text):
    """Send resume text to Gemini 1.5 Flash and get structured JSON."""
    model = genai.GenerativeModel("gemini-1.5-flash")
    chat_session = model.start_chat(history=[])

    # Prompt Gemini to extract structured information
    prompt = f"""
    Parse the following resume text and return a JSON with these fields:
    - Name
    - Contact (email, phone)
    - Skills (list)
    - Education (list of degrees, institutions, years)
    - Work Experience (list of companies, roles, duration)
    - Certifications (if any)
    Only return JSON, no extra text.

    Resume Text:
    {resume_text}
    """

    response = chat_session.send_message(prompt)
    cleaned_output = clean_json_text(response.text)
    return cleaned_output
if __name__ == "__main__":
    # Step 1: Read resume
    resume_text = read_resume(RESUME_FILE)

    # Step 2: Parse resume using Gemini
    parsed_json_text = parse_resume_with_gemini(resume_text)

    # Step 3: Convert to JSON and print
    try:
        parsed_json = json.loads(parsed_json_text)
        print("=== Parsed Resume JSON ===")
        print(json.dumps(parsed_json, indent=4))
        
        # Step 4: Save JSON to file
        output_file = r"parsed_resume.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(parsed_json, f, indent=4)
        print(f"\nParsed JSON saved to: {output_file}")

    except json.JSONDecodeError:
        print("Failed to parse JSON. Raw output:")
        print(parsed_json_text)
'''
import os
import re
import json
import subprocess
import google.generativeai as genai
from dotenv import load_dotenv
import sys

# Load environment variables from .env file
load_dotenv()
API_KEY = os.getenv("PARSE_API")  # Or directly use your key
genai.configure(api_key=API_KEY)

def clean_json_text(raw_text):
    """
    Remove any markdown/backticks or extra characters so it can be parsed as JSON.
    """
    cleaned = re.sub(r"```(?:json)?", "", raw_text, flags=re.IGNORECASE)
    cleaned = cleaned.strip()
    return cleaned

def parse_resume_with_gemini(resume_text):
    """Send resume text to Gemini 1.5 Flash and get structured JSON."""
    model = genai.GenerativeModel("gemini-1.5-flash")
    chat_session = model.start_chat(history=[])

    prompt = f"""
    Parse the following resume text and return a JSON with these fields:
    - Name
    - Contact (email, phone)
    - Skills (list)
    - Education (list of degrees, institutions, years)
    - Work Experience (list of companies, roles, duration)
    - Certifications (if any)
    Only return JSON, no extra text.

    Resume Text:
    {resume_text}
    """

    response = chat_session.send_message(prompt)
    cleaned_output = clean_json_text(response.text)
    return cleaned_output

if __name__ == "__main__":
    # Step 1: Read resume text from stdin
    resume_text = sys.stdin.read().strip()

    # Step 2: Parse resume using Gemini
    parsed_json_text = parse_resume_with_gemini(resume_text)

    # Step 3: Convert to JSON and print
    try:
        parsed_json = json.loads(parsed_json_text)
        print("=== Parsed Resume JSON ===")
        print(json.dumps(parsed_json, indent=4))

        # Step 4: Save JSON to file
        output_file = "parsed_resume.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(parsed_json, f, indent=4)
        print(f"\nParsed JSON saved to: {output_file}")

        # Step 5: Optionally call another script and pass JSON
        print("\nExecuting script.py...")
        result = subprocess.run(
            ["python", "script.py"],
            input=json.dumps(parsed_json),  # Pass JSON as input
            capture_output=True,
            text=True
        )

        print("\n=== script.py Output ===")
        print(result.stdout)
        if result.stderr:
            print("\n=== script.py Errors ===")
            print(result.stderr)

    except json.JSONDecodeError:
        print("Failed to parse JSON. Raw output:")
        print(parsed_json_text)





