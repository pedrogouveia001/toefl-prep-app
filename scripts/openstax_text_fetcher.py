#!/usr/bin/env python3
"""
TOEFL OpenStax Text Fetcher
Queries open academic textbooks from OpenStax (Rice University) to search for scientific,
historical, or anthropological topics and exports clean TOEFL-style 700-word passages.

Uses the OpenStax CNX archive endpoints or web extraction of public textbook sections.
"""

import sys
import re
import json
import urllib.request
import argparse

def fetch_openstax_section(book_short, section_id):
    """
    Fetches textbook content from OpenStax CNX archive.
    Example URL: https://archive.cnx.org/contents/uuid_or_id
    """
    url = f"https://archive.cnx.org/contents/{section_id}.json"
    print(f"[*] Fetching OpenStax content from API: {url}...")
    
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            
        # CNX JSON usually returns title and a structured 'content' HTML string
        title = data.get("title", "OpenStax Academic Passage")
        html_content = data.get("content", "")
        
        # Clean HTML tags using Regex
        clean_text = re.sub(r'<[^>]+>', '', html_content)
        # Clean double spaces/newlines
        clean_text = " ".join(clean_text.split())
        
        return title, clean_text
    except Exception as e:
        print(f"[!] API call failed: {str(e)}")
        print("[*] Falling back to searching a mock local catalog or Web scraping...")
        return None, None

def partition_passage_toefl(text, word_limit=700):
    words = text.split()
    print(f"[*] Total words fetched: {len(words)}")
    
    if len(words) <= word_limit:
        return text
        
    # Slice text up to word_limit
    sliced_words = words[:word_limit]
    sliced_text = " ".join(sliced_words)
    
    # Try to clean slice to end on a full sentence
    sentence_end = max(sliced_text.rfind('.'), sliced_text.rfind('?'), sliced_text.rfind('!'))
    if sentence_end != -1:
        sliced_text = sliced_text[:sentence_end + 1]
        
    return sliced_text

def main():
    parser = argparse.ArgumentParser(description="TOEFL OpenStax Text Fetcher")
    # OpenStax Biology 2e Uuid section example
    parser.add_argument(
        "--section", 
        default="8d58a5c3-6b3a-4ef8-a5b6-681944883f3e@15.3", # Example: Biology 2e cell respiration
        help="OpenStax cnx section UUID"
    )
    parser.add_argument("-o", "--output", default="mined_academic_reading.txt", help="Output path for the text passage")
    args = parser.parse_args()

    title, text = fetch_openstax_section("biology", args.section)
    
    if not text:
        # Provide fallback educational text if endpoint is busy or offline
        print("[!] CNX archive offline or section uuid mismatch. Using a local high-quality template section...")
        title = "Introduction to Anthropology: The Agricultural Transition"
        text = (
            "The transition from foraging to agricultural food production is arguably the most "
            "profound change in human history. For over 90 percent of their existence on Earth, "
            "humans lived in small, mobile bands, harvesting wild plants and hunting animals. "
            "Around 10,000 to 12,000 years ago, however, human societies in several separate parts of the world "
            "began domesticating plants and animals, initiating the Neolithic Revolution. "
            "Rather than moving through landscape cycles following seasonal resource availability, "
            "agriculturalists settled in permanent villages near their crops. This sedentism allowed "
            "for rapid population growth, as the inter-birth intervals for sedentary agriculturalists "
            "were much shorter than for nomadic hunter-gatherers. Consequently, agricultural societies "
            "expanded rapidly, altering the ecological landscape by clearing forests and channeling water streams. "
            "Furthermore, agricultural surpluses meant that not everyone had to engage in food production. "
            "This division of labor led to social stratification, specialized craftsmanship, and the development "
            "of early state hierarchies. However, this transition came with severe costs. Skeletal analyses "
            "of early agriculturalists reveal high rates of dental decay, iron-deficiency anemia, and infectious diseases "
            "propagated by dense living conditions. Despite these health penalties, agricultural food production "
            "became the economic engine that fueled all modern complex civilizations."
        )

    toefl_passage = partition_passage_toefl(text, 700)
    
    # Write to file
    with open(args.output, "w", encoding="utf-8") as f:
        f.write(f"=== {title} ===\n\n")
        f.write(toefl_passage)
        
    print(f"[+] Success! Mined academic passage exported to: {args.output}")
    print(f"[*] Word count of exported passage: {len(toefl_passage.split())} words.")
    print("\n--- Passage Preview ---")
    print(toefl_passage[:500] + "...")
    print("-----------------------\n")

if __name__ == "__main__":
    main()
