import json

from app.core.gemini_call import gemini_json


def _score_locally(document_data: dict) -> int:

    entities = document_data.get("key_entities", [])

    if not entities:
        return 30

    HIGH_WORDS = {
        "tinggi",
        "high",
        "critical",
        "kritis",
        "dangerous",
    }

    MEDIUM_WORDS = {
        "medium",
        "menengah",
        "moderate",
        "sedang",
    }

    high_count = 0
    medium_count = 0

    for entity in entities:

        risk = (
            entity.get("potential_risk", "")
            .lower()
            .strip()
        )

        if any(word in risk for word in HIGH_WORDS):
            high_count += 1

        elif any(word in risk for word in MEDIUM_WORDS):
            medium_count += 1

    total = len(entities)

    raw_score = (
        (high_count * 3) +
        (medium_count * 1.5)
    ) / (total * 3)

    score = int(raw_score * 100)

    if high_count > 0:
        score = max(score, 55)

    elif medium_count > 0:
        score = max(score, 30)

    return max(10, min(score, 95))


def _summarize_entities(entities: list) -> str:

    lines = []

    for entity in entities[:10]:

        name = entity.get(
            "entity_name",
            "Unknown"
        )

        risk = entity.get(
            "potential_risk",
            "Unknown"
        )

        lines.append(f"- {name}: {risk}")

    if len(entities) > 10:
        lines.append(
            f"- ... and {len(entities) - 10} additional entities"
        )

    return "\n".join(lines)


def analyze_risk(document_data: dict) -> dict:

    print("[Agent 2] Risk Detector is running...")

    summary = (
        document_data.get("summary", "")[:500]
    )

    entities_summary = _summarize_entities(
        document_data.get("key_entities", [])
    )

    fallback_score = _score_locally(document_data)

    prompt = f"""
You are an AI Enterprise Risk Assessor.

TASK:
Analyze the enterprise risk level based on
the document summary and detected entities.

MANDATORY RULES:
- Output must be valid JSON
- Do not use markdown
- Do not use backticks
- Do not add any explanation
- Do not write any text outside JSON

Document Summary:
{summary}

Entity List:
{entities_summary}

Required output format:

{{
  "risk_score": 45,
  "risk_level": "LOW",
  "reasoning": "Brief one-sentence rationale"
}}

Guidance:
- LOW = 0-30
- MEDIUM = 31-60
- HIGH = 61-100
"""

    result = gemini_json(
        prompt=prompt,
        fallback={
            "risk_score": fallback_score,
            "risk_level": "MEDIUM",
            "reasoning": "Fallback local scoring used.",
        },
        max_output_tokens=256,
    )

    try:

        score = int(
            result.get(
                "risk_score",
                fallback_score,
            )
        )

        score = max(0, min(score, 100))

    except Exception:

        print(
            "Invalid risk_score from AI, "
            "using fallback"
        )

        score = fallback_score

    risk_level = result.get(
        "risk_level",
        "MEDIUM",
    )

    reasoning = result.get(
        "reasoning",
        "No reasoning provided.",
    )

    document_data["overall_risk_score"] = score

    document_data["risk_assessment"] = {
        "risk_score": score,
        "risk_level": risk_level,
        "reasoning": reasoning,
    }

    print(
        f"[Agent 2] "
        f"Score: {score} "
        f"({risk_level})"
    )

    return document_data
