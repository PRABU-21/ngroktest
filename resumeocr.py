'''import fitz  # from PyMupdf help to read pdf and handle pages
import pdfplumber  # helps in table extraction
import os
import csv
import re
import pandas as pd
from tabulate import tabulate
from pdf2image import convert_from_path
import pytesseract  # helps to extract content from the image 
from PIL import Image
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import subprocess
import sys



pytesseract.pytesseract.tesseract_cmd = r'Tesseract-OCR\tesseract.exe'

def clean_text(text):
    if text is None:
        return ""
    text = re.sub(r'[\n\r\t]+', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def is_row_empty(row):
    return all(cell is None or cell.strip() == '' for cell in row)

def intersect_areas(bbox1, bbox2):
    x0_1, y0_1, x1_1, y1_1 = bbox1
    x0_2, y0_2, x1_2, y1_2 = bbox2 
    return not (x1_1 < x0_2 or x0_1 > x1_2 or y1_1 < y0_2 or y0_1 > y1_2)

def is_scanned_image(image):
    text = pytesseract.image_to_string(image)
    return bool(text.strip())

def extract_tables(pdf_path, page_num, output_dir):
    table_dataframes = []
    table_areas = []

    with pdfplumber.open(pdf_path) as pdf:
        tables = pdf.pages[page_num].extract_tables()
        if tables:
            for table_index, table in enumerate(tables):
                if len(table) > 1 and not all(is_row_empty(row) for row in table):
                    table_path = os.path.join(output_dir, f"page_{page_num + 1}_table{table_index + 1}.csv")
                    with open(table_path, mode='w', newline='', encoding='utf-8') as csv_file:
                        writer = csv.writer(csv_file)
                        for row in table:
                            cleaned_row = [clean_text(cell) for cell in row]
                            writer.writerow(cleaned_row)
                    df = pd.read_csv(table_path)
                    df_str = tabulate(df, headers='keys', tablefmt='grid', showindex=False)
                    table_dataframes.append(df_str)
                    table_bbox = pdf.pages[page_num].find_tables()[table_index].bbox
                    table_areas.append(table_bbox)

    return table_dataframes, table_areas

def extract_image_text_from_pdf_page(pdf_path, page_num):
    images = convert_from_path(pdf_path, first_page=page_num+1, last_page=page_num+1)
    image_text = ""
    for image in images:
        if is_scanned_image(image):
            image_text = pytesseract.image_to_string(image)
    return image_text

# NEW: Save extracted details into a TXT file instead of PDF
def save_report_as_txt(report_text, txt_path):
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(report_text)

def extract_contents_from_pdf(pdf_path, output_dir, report_txt_path):
    doc = fitz.open(pdf_path)
    os.makedirs(output_dir, exist_ok=True)
    total_pages = doc.page_count
    full_report = ""
    
    def process_page(page_num):
        page = doc.load_page(page_num)
        table_dataframes, table_areas = extract_tables(pdf_path, page_num, output_dir)
        extracted_text = page.get_text("blocks")
        text = ""

        for block in extracted_text:
            bbox = block[:4]
            block_text = block[4]
            if not any(intersect_areas(bbox, table_bbox) for table_bbox in table_areas):
                text += block_text

        if not text.strip():
            print(f"Text not detected on page {page_num + 1}, processing as image...")
            text = extract_image_text_from_pdf_page(pdf_path, page_num)

        page_content = f"Page {page_num + 1}:\n{text}"
        if table_dataframes:
            page_content += "\n" + "\n".join(table_dataframes)
        else:
            page_content += "\nNo tables detected on this page."
        
        return page_content

    with ThreadPoolExecutor() as thread_executor, ProcessPoolExecutor() as process_executor:
        page_futures = [thread_executor.submit(process_page, page_num) for page_num in range(total_pages)]
        for future in page_futures:
            full_report += future.result() + "\n" + "="*40 + "\n"

    save_report_as_txt(full_report, report_txt_path)
    print(f"Report saved to {report_txt_path}")
    doc.close()

# ======================
# PLACEHOLDERS (Change these before running)
file_path = sys.argv[1]  # This should be the uploaded PDF
# Then parse it and save parsed_resume.json
pdf_path = file_path
output_dir = r"ExtractedTables"
report_txt_path = r"resume_extracted.txt"

# ======================

# Run the extraction
extract_contents_from_pdf(pdf_path, output_dir, report_txt_path)

result = subprocess.run(
    [sys.executable, r"tojson.py"],
    input=extracted_text,   # directly send OCR text
    capture_output=True,
    text=True
)
'''
import fitz  # PyMuPDF
import pdfplumber
import os
import csv
import re
import pandas as pd
from tabulate import tabulate
from pdf2image import convert_from_bytes
import pytesseract
from PIL import Image
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import subprocess
import sys
import io

pytesseract.pytesseract.tesseract_cmd = r'Tesseract-OCR\tesseract.exe'

# -----------------------------
# Helper functions
# -----------------------------
def clean_text(text):
    if text is None:
        return ""
    text = re.sub(r'[\n\r\t]+', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def is_row_empty(row):
    return all(cell is None or cell.strip() == '' for cell in row)

def intersect_areas(bbox1, bbox2):
    x0_1, y0_1, x1_1, y1_1 = bbox1
    x0_2, y0_2, x1_2, y1_2 = bbox2 
    return not (x1_1 < x0_2 or x0_1 > x1_2 or y1_1 < y0_2 or y0_1 > y1_2)

def is_scanned_image(image):
    text = pytesseract.image_to_string(image)
    return bool(text.strip())

def extract_tables_from_pdf(pdf_bytes, page_num, output_dir):
    table_dataframes = []
    table_areas = []

    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        tables = pdf.pages[page_num].extract_tables()
        if tables:
            for table_index, table in enumerate(tables):
                if len(table) > 1 and not all(is_row_empty(row) for row in table):
                    # CSV path (optional, can skip saving if not needed)
                    table_path = os.path.join(output_dir, f"page_{page_num + 1}_table{table_index + 1}.csv")
                    with open(table_path, mode='w', newline='', encoding='utf-8') as csv_file:
                        writer = csv.writer(csv_file)
                        for row in table:
                            cleaned_row = [clean_text(cell) for cell in row]
                            writer.writerow(cleaned_row)
                    df = pd.read_csv(table_path)
                    df_str = tabulate(df, headers='keys', tablefmt='grid', showindex=False)
                    table_dataframes.append(df_str)
                    table_bbox = pdf.pages[page_num].find_tables()[table_index].bbox
                    table_areas.append(table_bbox)

    return table_dataframes, table_areas

def extract_image_text_from_pdf_page(pdf_bytes, page_num):
    images = convert_from_bytes(pdf_bytes, first_page=page_num+1, last_page=page_num+1)
    image_text = ""
    for image in images:
        if is_scanned_image(image):
            image_text = pytesseract.image_to_string(image)
    return image_text

def extract_contents_from_pdf_bytes(pdf_bytes, output_dir):
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    os.makedirs(output_dir, exist_ok=True)
    total_pages = doc.page_count
    full_report = ""
    
    def process_page(page_num):
        page = doc.load_page(page_num)
        table_dataframes, table_areas = extract_tables_from_pdf(pdf_bytes, page_num, output_dir)
        extracted_text = page.get_text("blocks")
        text = ""

        for block in extracted_text:
            bbox = block[:4]
            block_text = block[4]
            if not any(intersect_areas(bbox, table_bbox) for table_bbox in table_areas):
                text += block_text

        if not text.strip():
            print(f"Text not detected on page {page_num + 1}, processing as image...")
            text = extract_image_text_from_pdf_page(pdf_bytes, page_num)

        page_content = f"Page {page_num + 1}:\n{text}"
        if table_dataframes:
            page_content += "\n" + "\n".join(table_dataframes)
        else:
            page_content += "\nNo tables detected on this page."
        
        return page_content

    with ThreadPoolExecutor() as thread_executor, ProcessPoolExecutor() as process_executor:
        page_futures = [thread_executor.submit(process_page, page_num) for page_num in range(total_pages)]
        for future in page_futures:
            full_report += future.result() + "\n" + "="*40 + "\n"

    doc.close()
    return full_report

# -----------------------------
# Main execution
# -----------------------------
if __name__ == "__main__":
    # Read PDF bytes from stdin (sent directly from FastAPI endpoint)
    pdf_bytes = sys.stdin.buffer.read()

    output_dir = r"ExtractedTables"  # optional, used for table CSVs if needed

    # Extract OCR text
    extracted_text = extract_contents_from_pdf_bytes(pdf_bytes, output_dir)

    # Pass OCR text directly to tojson.py via stdin
    result = subprocess.run(
        [sys.executable, r"tojson.py"],
        input=extracted_text,
        capture_output=True,
        text=True
    )

    # Print output from tojson.py (JSON recommendations)
    print(result.stdout)
    if result.stderr:
        print("=== Errors ===")
        print(result.stderr)





