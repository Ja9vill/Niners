import os
import sys
from pypdf import PdfReader

pdf_dir = r"C:\Users\Jwavp\OneDrive\Desktop\NINE DASHBOARD\WORKBOOKS"
out_dir = r"C:\Users\Jwavp\OneDrive\Desktop\NINE DASHBOARD\WORKBOOKS"

pdfs = [
    "ANTIGRAVITY PROMPT TO BUILD.pdf",
    "APPROVED APP CATEGORIES LAYOUT V.2.pdf",
    "DATA MASTERSHEET FINAL BUILD V.2.pdf",
    "FINANCIAL DATA SHEET FINAL BUILD V2.pdf",
    "ROSTER REPORTING FINAL BUILD V.2.pdf",
    "final locked product spec V.1.pdf"
]

for pdf in pdfs:
    pdf_path = os.path.join(pdf_dir, pdf)
    txt_path = os.path.join(out_dir, pdf.replace(".pdf", ".txt"))
    
    # Check if text file already exists and is non-empty, skip it to save time
    if os.path.exists(txt_path) and os.path.getsize(txt_path) > 100:
        print(f"Skipping {pdf} (already extracted)", flush=True)
        continue
        
    print(f"Extracting {pdf}...", flush=True)
    if not os.path.exists(pdf_path):
        print(f"Error: file not found: {pdf_path}", flush=True)
        continue
    try:
        reader = PdfReader(pdf_path)
        num_pages = len(reader.pages)
        print(f"Found {num_pages} pages in {pdf}", flush=True)
        text = ""
        for i in range(num_pages):
            print(f"  Reading page {i+1}/{num_pages}...", flush=True)
            page = reader.pages[i]
            page_text = page.extract_text()
            text += f"--- Page {i+1} ---\n{page_text}\n"
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"Successfully extracted {pdf} to {txt_path}", flush=True)
    except Exception as e:
        print(f"Error extracting {pdf}: {e}", flush=True)
