from app.core.gemini_call import gemini_json

def validate_analysis(risk_data: dict) -> dict:
    """Agent 3: Validate data integrity and provide a verdict."""
    print("[Agent 3] Validator is reviewing...")

    summary = risk_data.get("summary", "")
    score   = risk_data.get("overall_risk_score", 0)

    prompt = f"""
    You are an AI Compliance Auditor.
    Review the following summary and risk score:

    Summary: {summary}
    Risk Score: {score}

    Your task:
    1. Provide one professional conclusion sentence (max 15 words).
    2. Set the status to "VALIDATED" or "REJECTED".

    Output pure JSON only, without markdown:
    {{
      "conclusion": "conclusion sentence",
      "status": "VALIDATED"
    }}
    """

    fallback = {"conclusion": "Manual review required.", "status": "PENDING"}
    result   = gemini_json(prompt, fallback=fallback)

    risk_data["final_validation"] = result
    print("[Agent 3] Complete.")
    return risk_data
