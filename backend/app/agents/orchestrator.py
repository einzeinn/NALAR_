import time
from app.agents.document import analyze_document_with_ai
from app.agents.risk import analyze_risk
from app.agents.validator import validate_analysis
from app.agents.summarizer import summarize_analysis
from app.agents.recommender import generate_recommendations

def run_multi_agent_pipeline(text: str) -> dict:
    """Run the 5 AI agents in sequence."""
    print("\n[Orchestrator] Starting Multi-Agent Pipeline (5 agents)...")

    # Phase 1: Document Analyzer
    print("[Agent D] Document Analyzer is reading the text...")
    time.sleep(2)
    document_data = analyze_document_with_ai(text)

    # Phase 2: Risk Detector
    print("[Agent A] Anomaly/Risk Detector is identifying threats...")
    time.sleep(2)
    risk_data = analyze_risk(document_data)

    # Phase 3: Validator & Checker
    print("[Agent V] Validator is cross-checking facts...")
    time.sleep(2)
    validated_data = validate_analysis(risk_data)

    # Phase 4: Smart Summarizer
    print("[Agent S] Smart Summarizer is building categorized insights...")
    time.sleep(2)
    summarized_data = summarize_analysis(validated_data)

    # Phase 5: Recommendation Engine
    print("[Agent R] Recommendation Engine is preparing the action plan...")
    time.sleep(2)
    final_data = generate_recommendations(summarized_data)

    print("[Orchestrator] Pipeline complete. 5/5 agents succeeded.")
    return final_data
