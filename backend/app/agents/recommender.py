import json
from app.core.gemini_call import gemini_json

def generate_recommendations(summarized_data: dict) -> dict:
    """Agent 5: Recommended corrective actions."""
    print("[Agent 5] Recommendation Engine is preparing the action plan...")

    anomaly_feed = json.dumps(
        summarized_data.get("smart_summary", {}).get("anomaly_feed", []), indent=2
    )
    score      = summarized_data.get("overall_risk_score", 0)
    risk_cats  = json.dumps(
        summarized_data.get("smart_summary", {}).get("risk_categories", {}), indent=2
    )

    prompt = f"""
    You are an AI Enterprise Security Consultant.
    Based on the anomalies below, create concrete and actionable recommendations.

    DETECTED ANOMALIES:
    {anomaly_feed}

    RISK CATEGORIES:
    {risk_cats}

    OVERALL RISK SCORE: {score}

    OUTPUT RULES (pure JSON, no markdown):
    {{
      "recommendations": [
        {{
          "action": "Short, decisive action title (max 8 words)",
          "detail": "Concrete step explanation (1-2 sentences)",
          "priority": "HIGH/MEDIUM/LOW",
          "category": "ACCESS/FINANCIAL/COMPLIANCE/OPERATIONAL",
          "effort": "IMMEDIATE/SHORT_TERM/LONG_TERM"
        }}
      ],
      "overall_recommendation": "One primary recommendation for management (1 sentence)",
      "estimated_resolution_days": 14
    }}

    Create 3-5 recommendations. Prioritize HIGH severity first.
    Output pure JSON only.
    """

    fallback = {
        "recommendations": [],
        "overall_recommendation": "Manual assessment required by security team.",
        "estimated_resolution_days": 30,
    }
    result = gemini_json(prompt, fallback=fallback)

    summarized_data["action_report"] = result
    print("[Agent 5] Complete.")
    return summarized_data
