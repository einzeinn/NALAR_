# Demo Files for NALAR_ AI Analysis

This folder contains sample files for testing NALAR_'s multi-agent pipeline.

## Files

### `server_auth_log.txt`
A realistic server authentication log containing:
- Normal login/logout events
- Failed authentication attempts
- Security incidents (brute force, unauthorized access)
- Certificate expiration warnings
- API key misuse detection
- Database maintenance events
- Suspicious data access patterns

**Use case**: Tests NALAR_'s ability to identify security risks, anomalies, and compliance issues in infrastructure logs.

### `financial_anomaly_report.csv`
A CSV file with transaction data containing:
- Normal business expenses (food, travel, software)
- Flagged transactions (unusual vendors, high amounts)
- Critical transactions (offshore entities, suspicious partners)
- Anomalous patterns (multiple high-value transfers from same user)

**Use case**: Tests NALAR_'s ability to detect financial irregularities, fraud indicators, and compliance violations.

## How to Use

1. Start NALAR_ frontend (http://localhost:3000)
2. Click "Upload File"
3. Select one of these demo files
4. Watch the 5-agent pipeline analyze the file:
   - **Document Analyzer**: Extracts structure and entities
   - **Anomaly Detector**: Identifies risks and scores them
   - **Validator**: Confirms findings and confidence levels
   - **Smart Summarizer**: Builds executive summary with risk breakdown
   - **Recommendation Engine**: Generates actionable remediation steps

## Expected Results

- **server_auth_log.txt**: Risk Score 78-85 | Categories: Security, Compliance
- **financial_anomaly_report.csv**: Risk Score 82-90 | Categories: Financial, Fraud

---

**Note**: These are synthetic examples for demonstration purposes. They contain realistic patterns that NALAR_ can detect and analyze.
