import json
from app.core.gemini_call import gemini_json

def summarize_analysis(validated_data: dict) -> dict:
    """Agent 4: Executive summary and risk categorization."""
    print("[Agent 4] Smart Summarizer is preparing insights...")

    summary    = validated_data.get("summary", "")
    score      = validated_data.get("overall_risk_score", 0)
    entities   = json.dumps(validated_data.get("key_entities", []), indent=2)
    validation = json.dumps(validated_data.get("final_validation", {}), indent=2)

    prompt = f"""
    You are an AI Chief Risk Officer preparing an executive report.
    Based on the data below, create a risk summary split into 3 business categories.

    DATA:
    - Document Summary: {summary}
    - Risk Score: {score}
    - Entities and Risks: {entities}
    - Validation Result: {validation}

    OUTPUT RULES (pure JSON, no markdown):
    {{
      "executive_brief": "One professional executive summary paragraph (2-3 sentences)",
      "risk_categories": {{
        "access_risk": "Access and system security risk analysis (1-2 sentences)",
        "financial_risk": "Financial and budget risk analysis (1-2 sentences)",
        "compliance": "Regulatory and standards compliance analysis (1-2 sentences)"
      }},
      "anomaly_feed": [
        {{
          "title": "Short anomaly title",
          "description": "Anomaly details",
          "severity": "HIGH/MEDIUM/LOW",
          "category": "ACCESS/FINANCIAL/COMPLIANCE/OPERATIONAL"
        }}
      ]
    }}

    Create 2-4 anomaly_feed items based on the available entities.
    Output pure JSON only.
    """

    fallback = {
        "executive_brief": "Smart summary unavailable.",
        "risk_categories": {
            "access_risk": "Unable to analyze.",
            "financial_risk": "Unable to analyze.",
            "compliance": "Unable to analyze.",
        },
        "anomaly_feed": [],
    }
    result = gemini_json(prompt, fallback=fallback)

    validated_data["smart_summary"] = result
    print("[Agent 4] Complete.")
    return validated_data
