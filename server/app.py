from flask import Flask, request, jsonify
from pathlib import Path
from werkzeug.utils import secure_filename
import traceback
import uuid

from file_handler import DocumentProcessor
from builder import RetrieverBuilder
from workflow import AgentWorkflow
from utils.logging import logger

app = Flask(__name__)


@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

UPLOAD_DIR = Path(__file__).parent / ".uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# In-memory session store: session_id -> EnsembleRetriever
_sessions: dict = {}

_processor = DocumentProcessor()
_retriever_builder = RetrieverBuilder()
_workflow = AgentWorkflow()


class _FileRef:
    """Thin wrapper so DocumentProcessor accepts a saved file path."""
    def __init__(self, path: str):
        self.name = path


def _build_session(paths: list[str]) -> str:
    chunks = _processor.process([_FileRef(p) for p in paths])
    if not chunks:
        raise ValueError("No processable content found in the provided files.")
    retriever = _retriever_builder.build_hybrid_retriever(chunks)
    session_id = str(uuid.uuid4())
    _sessions[session_id] = retriever
    return session_id


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/upload")
def upload():
    files = request.files.getlist("files")
    if not files:
        return jsonify({"error": "No files provided"}), 400

    saved: list[str] = []
    for f in files:
        filename = secure_filename(f.filename or "upload")
        dest = UPLOAD_DIR / filename
        f.save(dest)
        saved.append(str(dest))
        logger.info(f"Saved upload: {dest}")

    try:
        session_id = _build_session(saved)
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

    return jsonify({"document_ids": [session_id]})


@app.post("/query")
def query():
    data = request.get_json(silent=True) or {}
    question = (data.get("question") or "").strip()
    document_ids: list[str] = data.get("document_ids") or []

    if not question:
        return jsonify({"error": "question is required"}), 400
    if not document_ids:
        return jsonify({"error": "document_ids is required"}), 400

    retriever = _sessions.get(document_ids[0])
    if retriever is None:
        return jsonify({"error": "Session not found. Please upload documents first."}), 404

    try:
        result = _workflow.full_pipeline(question, retriever)
    except Exception as e:
        logger.error(f"Workflow error: {e}")
        return jsonify({"error": "Failed to process query"}), 500

    return jsonify({
        "answer": result["draft_answer"],
        "verification_report": result["verification_report"],
        "relevance": result.get("relevance", ""),
    })


@app.post("/examples/<example_id>")
def load_example(example_id: str):
    example_dir = Path(__file__).parent / "examples" / example_id
    if not example_dir.exists():
        return jsonify({"error": f"Example '{example_id}' not found"}), 404

    paths = [str(p) for p in example_dir.iterdir() if p.is_file()]
    if not paths:
        return jsonify({"error": "Example directory is empty"}), 422

    try:
        session_id = _build_session(paths)
    except Exception as e:
        logger.error(f"Failed to load example '{example_id}': {e}")
        return jsonify({"error": "Failed to process example documents"}), 500

    return jsonify({"document_ids": [session_id]})


if __name__ == "__main__":
    app.run(debug=True, port=8000)
