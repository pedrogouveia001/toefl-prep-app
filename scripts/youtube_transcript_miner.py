#!/usr/bin/env python3
"""
TOEFL YouTube Transcript Miner
Fetches human-curated transcripts from educational lecture channels (e.g. MIT OCW, Yale, TED-Ed)
using the youtube-transcript-api and formats it as a Listening Mock Test for Cerebrum.

Requirements:
    pip install youtube-transcript-api
"""

import sys
import json
import argparse
from youtube_transcript_api import YouTubeTranscriptApi

def fetch_and_clean_transcript(video_id):
    print(f"[*] Fetching transcript for Video ID: {video_id}...")
    try:
        # Retrieve transcript (preferring English 'en')
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en'])
        
        # Merge subtitles into clean paragraphs
        full_text = []
        for entry in transcript_list:
            text = entry['text'].strip()
            # Clean up common subtitle symbols
            text = text.replace('\n', ' ')
            full_text.append(text)
            
        merged_text = " ".join(full_text)
        
        # Clean double spaces
        merged_text = " ".join(merged_text.split())
        return merged_text
        
    except Exception as e:
        print(f"[!] Error fetching transcript: {str(e)}")
        sys.exit(1)

def build_toefl_listening_json(video_id, transcript_text):
    print("[*] Building TOEFL Listening mock test structure...")
    
    # Listening Mock Structure for app.js
    listening_mock = {
        "title": f"TOEFL Listening: Mined Video ({video_id})",
        "type": "listening",
        "youtubeId": video_id,
        "audioText": transcript_text,
        "passage": "<p><strong>🔊 TOEFL Listening Simulation</strong><br>Click the play button below to listen to the lecture. Answer the multiple-choice questions on the right based on the lecture contents.</p>",
        "questions": [
            {
                "id": 1,
                "type": "mc",
                "text": "What is the main topic discussed in the lecture?",
                "options": [
                    "A specific detail from the first minute",
                    "The main overall argument of the professor",
                    "A comparison of two minor sub-topics",
                    "The syllabus of the introductory course"
                ],
                "correct": "The main overall argument of the professor"
            },
            {
                "id": 2,
                "type": "mc",
                "text": "Why does the professor mention a specific example in the lecture?",
                "options": [
                    "To support the main theory outlined earlier",
                    "To disprove the previous researcher's hypothesis",
                    "To introduce a new and unrelated sub-topic",
                    "To entertain the students with a joke"
                ],
                "correct": "To support the main theory outlined earlier"
            }
        ]
    }
    return listening_mock

def main():
    parser = argparse.ArgumentParser(description="TOEFL YouTube Transcript Miner")
    parser.add_argument("video_id", help="The 11-character YouTube Video ID (e.g. W276_VEnC4U)")
    parser.add_argument("-o", "--output", default="mined_listening_data.json", help="Path to save the JSON result")
    args = parser.parse_args()

    # YouTube Video IDs are typically 11 chars
    if len(args.video_id) != 11:
        print("[!] Warning: Video ID is not 11 characters. Please verify your input ID.")

    transcript = fetch_and_clean_transcript(args.video_id)
    structured_json = build_toefl_listening_json(args.video_id, transcript)
    
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(structured_json, f, indent=4, ensure_ascii=False)
        
    print(f"[+] Success! Mined transcript and exported TOEFL layout to: {args.output}")
    print(f"[*] Word count of transcript: {len(transcript.split())} words.")
    print("\n--- Transcript Snippet Preview ---")
    print(transcript[:400] + "...")
    print("----------------------------------\n")
    print("[*] Note: You will need to add more questions manually or use Gemini to help write high-quality comprehension checks based on the transcript.")

if __name__ == "__main__":
    main()
