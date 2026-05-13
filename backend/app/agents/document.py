from app.core.gemini_call import gemini_json

def analyze_document_with_ai(text: str) -> dict:
    """Agent 1: Extract entities from document text."""
    print("[Agent 1] Document Analyzer is running...")

    prompt = f"""
    You are an AI Enterprise Document Analyzer.
    Analyze the following document text and extract its information into JSON format.

    CRITICAL RULES:
    - Output must be pure JSON only.
    - Do not use markdown backticks.
    - Do not add opening or closing prose.

    Required JSON structure:
    {{
      "summary": "Professional 2-3 sentence document summary",
      "key_entities": [
        {{
          "entity_name": "Feature, technology, or entity name",
          "description": "Brief description from the document",
          "potential_risk": "Potential risk analysis (Low/Medium/High)"
        }}
      ]
    }}

    Document Text:
    {text}
    """

    fallback = {
        "summary": "Document analysis failed.",
        "key_entities": [],
    }
    result = gemini_json(prompt, fallback=fallback)
    print("[Agent 1] Complete.")
    return result
