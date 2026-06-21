#!/usr/bin/env python3
"""
TOEFL PDF Extractor & Parser
Extracts Reading/Writing passages, questions, options, and answers from official ETS practice PDFs
using pdfplumber and structures them into JSON format compatible with Cerebrum English Tutor.

Requirements:
    pip install pdfplumber
"""

import os
import re
import json
import argparse

def extract_raw_text(pdf_path):
    print(f"[*] Opening PDF: {pdf_path}")
    import pdfplumber
    full_text = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text()
            if text:
                full_text.append(text)
    return "\n".join(full_text)

def parse_toefl_reading(raw_text):
    print("[*] Parsing Reading Passage & Questions using Regex...")
    
    # Structure of Reading Task in Cerebrum Mock Tests
    test_structure = {
        "title": "TOEFL Mined Reading Test",
        "type": "reading",
        "passage": "",
        "questions": []
    }

    # Attempt to extract title
    title_match = re.search(r"(?:TOEFL iBT®|Reading Practice Set)\s*\n+(.+)", raw_text)
    if title_match:
        test_structure["title"] = f"TOEFL Reading: {title_match.group(1).strip()}"

    # Locate Reading Passage
    # ETS PDFs typically contain "Directions: Read the passage below and answer the questions."
    passage_start = raw_text.find("Directions: Read the passage")
    if passage_start == -1:
        passage_start = raw_text.find("Read the passage")
        
    passage_end = raw_text.find("Paragraph\n1")
    if passage_end == -1:
        passage_end = raw_text.find("Question 1")

    # Fallback to general segment if markers not found
    if passage_start != -1 and passage_end != -1 and passage_end > passage_start:
        passage_raw = raw_text[passage_start:passage_end]
    else:
        # Fallback first 3000 chars as passage
        passage_raw = raw_text[:3000]

    # Clean and format passage as HTML paragraphs
    paragraphs = [p.strip() for p in passage_raw.split("\n\n") if len(p.strip()) > 50]
    passage_html = ""
    for idx, p in enumerate(paragraphs):
        p_clean = re.sub(r"\s+", " ", p)
        passage_html += f"<p><strong>Section {idx+1}</strong><br>{p_clean}</p>\n\n"
    
    test_structure["passage"] = passage_html

    # Parse Questions, Options, and Answers
    # Look for patterns like "1. According to paragraph 1..." followed by A, B, C, D options
    question_blocks = re.findall(r"(\d+\.\s+[^?.\n]+[\s\S]+?)(?=\n\d+\.\s+|$)", raw_text)
    
    q_id = 1
    for block in question_blocks:
        lines = [line.strip() for line in block.split("\n") if line.strip()]
        if not lines:
            continue
            
        q_text = lines[0]
        # Clean question number
        q_text = re.sub(r"^\d+\.\s*", "", q_text)
        
        options = []
        correct_answer = "A" # Default placeholder
        
        # Detect options (A) or (B) or (C) or (D) or A. B. C. D.
        for line in lines[1:]:
            opt_match = re.match(r"^\(?(A|B|C|D)\)?\s*(.+)", line, re.IGNORECASE)
            if opt_match:
                options.append(opt_match.group(2).strip())
            # Check for Answer key indicators
            ans_match = re.search(r"AnswerKey:\s*([A-D])|CorrectAnswer:\s*([A-D])", line, re.IGNORECASE)
            if ans_match:
                correct_answer = ans_match.group(1) or ans_match.group(2)
        
        # If options parsed, add to list
        if len(options) >= 2:
            # Map correct answer letter to the actual option text if possible
            answer_text = options[0]
            letter_index = ord(correct_answer.upper()) - ord('A')
            if 0 <= letter_index < len(options):
                answer_text = options[letter_index]
                
            test_structure["questions"].append({
                "id": q_id,
                "type": "mc",
                "text": q_text,
                "options": options,
                "correct": answer_text
            })
            q_id += 1
            
    return test_structure

def main():
    parser = argparse.ArgumentParser(description="TOEFL PDF Scraper & Parser")
    parser.add_argument("pdf_path", help="Path to the official ETS TOEFL prep PDF file")
    parser.add_argument("-o", "--output", default="mined_reading_data.json", help="Path to save structured JSON output")
    args = parser.parse_args()

    if not os.path.exists(args.pdf_path):
        print(f"[!] Error: File not found at {args.pdf_path}")
        return

    try:
        raw_text = extract_raw_text(args.pdf_path)
        structured_data = parse_toefl_reading(raw_text)
        
        # Write to JSON
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(structured_data, f, indent=4, ensure_ascii=False)
            
        print(f"[+] Success! Structured data saved to: {args.output}")
        print(f"[+] Extracted {len(structured_data['questions'])} questions and passage outline.")
        
        # Display preview of formatting
        print("\n=== structured JSON Preview ===")
        print(json.dumps(structured_data, indent=2)[:500] + "...\n================================")
        
    except ImportError:
        print("[!] Error: pdfplumber is not installed. Install it using 'pip install pdfplumber'.")
    except Exception as e:
        print(f"[!] Processing failed: {str(e)}")

if __name__ == "__main__":
    main()
