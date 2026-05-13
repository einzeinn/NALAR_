from fastapi import APIRouter, UploadFile, File, HTTPException
import os
import io
from app.agents.orchestrator import run_multi_agent_pipeline

router = APIRouter()
UPLOAD_DIR = "temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Maximum text sent to AI (characters)
MAX_CHARS = 10_000

SUPPORTED_EXTENSIONS = {".pdf", ".csv", ".xlsx", ".xls", ".txt", ".log"}


def extract_text_from_file(file_path: str, filename: str) -> str:
    """Extract text from supported file formats."""
    ext = os.path.splitext(filename)[1].lower()

    # ── PDF ──────────────────────────────────────────────────────────────────
    if ext == ".pdf":
        from pypdf import PdfReader
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        if not text.strip():
            raise ValueError("The PDF does not contain extractable text. "
                             "It may be a scanned or image-based file.")
        return text

    # ── CSV ──────────────────────────────────────────────────────────────────
    elif ext == ".csv":
        import csv
        rows = []
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.reader(f)
            for i, row in enumerate(reader):
                rows.append(", ".join(row))
                if i >= 500:  # max 500 rows
                    rows.append("... (truncated)")
                    break
        text = "\n".join(rows)
        if not text.strip():
            raise ValueError("The CSV file is empty or cannot be read.")
        return text

    # ── XLSX / XLS ───────────────────────────────────────────────────────────
    elif ext in {".xlsx", ".xls"}:
        try:
            import openpyxl
            wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
            rows = []
            for sheet in wb.worksheets:
                rows.append(f"[Sheet: {sheet.title}]")
                for i, row in enumerate(sheet.iter_rows(values_only=True)):
                    cells = [str(c) if c is not None else "" for c in row]
                    rows.append(", ".join(cells))
                    if i >= 300:
                        rows.append("... (truncated)")
                        break
            wb.close()
            text = "\n".join(rows)
            if not text.strip():
                raise ValueError("The Excel file is empty.")
            return text
        except ImportError:
            raise ValueError("The openpyxl library is not installed. "
                             "Run: pip install openpyxl")

    # ── TXT / LOG ────────────────────────────────────────────────────────────
    elif ext in {".txt", ".log"}:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            text = f.read()
        if not text.strip():
            raise ValueError("The text file is empty.")
        return text

    else:
        raise ValueError(
            f"The '{ext}' format is not supported. "
            f"Accepted formats: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
        )


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    filename = file.filename or "unknown"
    ext = os.path.splitext(filename)[1].lower()

    # ── Validasi ekstensi ─────────────────────────────────────────────────────
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail={
                "error": "unsupported_format",
                "message": f"The '{ext}' format is not supported.",
                "supported": sorted(SUPPORTED_EXTENSIONS),
            },
        )

    # ── Simpan file sementara ─────────────────────────────────────────────────
    file_path = os.path.join(UPLOAD_DIR, filename)
    try:
        content = await file.read()

        # Validate size (max 20 MB).
        if len(content) > 20 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail={
                    "error": "file_too_large",
                    "message": "File size exceeds the 20 MB limit.",
                },
            )

        with open(file_path, "wb") as buffer:
            buffer.write(content)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": "save_failed", "message": f"Failed to save file: {str(e)}"},
        )

    # ── Ekstrak teks ──────────────────────────────────────────────────────────
    try:
        raw_text = extract_text_from_file(file_path, filename)
    except ValueError as e:
        raise HTTPException(
            status_code=422,
            detail={"error": "extraction_failed", "message": str(e)},
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": "extraction_error", "message": f"Error while reading file: {str(e)}"},
        )

    # ── Truncate & pipeline ───────────────────────────────────────────────────
    extracted_text = raw_text[:MAX_CHARS]

    try:
        ai_analysis_json = run_multi_agent_pipeline(extracted_text)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": "pipeline_failed", "message": f"AI pipeline error: {str(e)}"},
        )

    return {
        "status": "success",
        "filename": filename,
        "file_type": ext,
        "char_count": len(extracted_text),
        "ai_analysis": ai_analysis_json,
    }
