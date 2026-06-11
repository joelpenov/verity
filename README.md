# Verity — Multi-Agent RAG System

> Source-grounded document Q&A powered by a LangGraph multi-agent pipeline, hybrid retrieval, and a Next.js frontend.

Built by [@joelpenov](https://github.com/joelpenov)

---

## What it does

Verity lets you upload any document (PDF, DOCX, TXT, Markdown) and ask natural-language questions about it. Instead of a single LLM call, every answer passes through a three-stage multi-agent pipeline:

1. **Relevance Check** — determines whether the question is answerable from the uploaded content before doing any expensive retrieval.
2. **Research Agent** — retrieves the most relevant document sections via hybrid search and generates an initial answer.
3. **Verification Agent** — cross-checks the answer against the source material, flags unsupported claims, and triggers a re-research loop if the answer fails verification.

The result is a verified, source-grounded answer alongside a structured verification report — no hallucinations, no dead ends.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js Client                       │
│  FileUpload · ExampleSelector · QueryInput · Results Panel  │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP (REST)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        Flask API  (:8000)                   │
│   POST /upload   POST /query   POST /examples/:id           │
└───────────────────────────┬─────────────────────────────────┘
                            │
              ┌─────────────▼─────────────┐
              │      AgentWorkflow        │
              │      (LangGraph)          │
              │                           │
              │  ┌─────────────────────┐  │
              │  │  check_relevance    │  │
              │  │  (RelevanceChecker) │  │
              │  └────────┬────────────┘  │
              │           │               │
              │    ┌──────▼──────┐        │
              │    │  research   │◄───┐   │
              │    │  (ResearchAgent) │   │
              │    └──────┬──────┘   │   │
              │           │          │   │
              │    ┌──────▼──────┐   │   │
              │    │   verify    │───┘   │
              │    │ (Verifier)  │ fail  │
              │    └──────┬──────┘       │
              │           │ pass         │
              └───────────▼──────────────┘
                       Response
```

### Document ingestion pipeline

```
File upload
    │
    ▼
Docling (PDF/DOCX → Markdown)
    │
    ▼
MarkdownHeaderTextSplitter (LangChain)
    │
    ├──► ChromaDB  (vector embeddings via OpenAI)
    │
    └──► BM25Retriever (keyword index)
              │
              ▼
        EnsembleRetriever
        (hybrid: 50% BM25 + 50% vector)
```

---

## Tech Stack

### Server
| Layer | Technology |
|---|---|
| API | Flask + Flask-CORS |
| Agent orchestration | LangGraph |
| LLM | OpenAI GPT-4o-mini |
| Document parsing | Docling |
| Text splitting | LangChain Text Splitters |
| Vector store | ChromaDB |
| Keyword retrieval | BM25 (rank-bm25) |
| Hybrid retrieval | LangChain EnsembleRetriever |
| Embeddings | OpenAI Embeddings |

### Client
| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + CSS design tokens |
| Animations | CSS keyframes (transform/opacity only) |

---

## Project Structure

```
.
├── server/
│   ├── app.py                  # Flask API entry point
│   ├── workflow.py             # LangGraph multi-agent graph
│   ├── file_handler.py         # Document processing & caching
│   ├── builder.py              # Hybrid retriever builder
│   ├── research_agent.py       # Answer generation agent
│   ├── verification_agent.py   # Answer verification agent
│   ├── relevance_checker.py    # Query relevance classification
│   ├── config/
│   │   ├── settings.py         # Env-based configuration
│   │   └── constants.py        # App-wide constants
│   ├── utils/
│   │   └── logging.py          # Shared logger
│   ├── examples/               # Predefined example documents
│   └── requirements.txt
│
└── client/
    ├── app/
    │   ├── page.tsx            # Main page & state orchestration
    │   ├── layout.tsx          # Root layout
    │   └── globals.css         # Design system (CSS tokens + animations)
    ├── components/
    │   ├── FileUpload.tsx       # Drag-and-drop upload
    │   ├── ExampleSelector.tsx  # Example document picker
    │   ├── QueryInput.tsx       # Query textarea + suggestions
    │   ├── VerificationReport.tsx # Structured report display
    │   ├── Skeleton.tsx         # Shimmer loading skeleton
    │   └── TypewriterText.tsx   # Typewriter answer animation
    ├── lib/
    │   └── api.ts              # Typed API client
    ├── types/
    │   └── index.ts            # Shared TypeScript types
    └── .env.local              # API base URL
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- An [OpenAI API key](https://platform.openai.com/api-keys)

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd "DocChat Build a Multi-Agent RAG System"
```

### 2. Server setup

```bash
cd server

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

Create a `.env` file in `server/`:

```env
OPENAI_API_KEY=sk-...
CHROMA_DB_PATH=./chroma_db
VECTOR_SEARCH_K=5
CACHE_DIR=./.cache
```

Start the API:

```bash
python app.py
# Listening on http://localhost:8000
```

### 3. Client setup

```bash
cd client
npm install
npm run dev
# Open http://localhost:3000
```

> **Note for macOS users:** macOS runs AirPlay Receiver on port 5000. The server uses port **8000** to avoid this conflict.

---

## API Reference

All endpoints are served from `http://localhost:8000`.

### `POST /upload`

Upload one or more documents for processing.

**Request:** `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `files` | `File[]` | PDF, DOCX, TXT, or MD files (max 50 MB total) |

**Response:**
```json
{
  "document_ids": ["<session-uuid>"]
}
```

---

### `POST /query`

Ask a question against previously uploaded documents.

**Request:** `application/json`

```json
{
  "question": "What are the main conclusions?",
  "document_ids": ["<session-uuid>"]
}
```

**Response:**
```json
{
  "answer": "The document concludes that...",
  "verification_report": "Supported: YES\nUnsupported Claims: None\nContradictions: None\nRelevant: YES\nAdditional Details: ...",
  "relevance": "CAN_ANSWER"
}
```

`relevance` is one of: `CAN_ANSWER` · `PARTIAL` · `NO_MATCH`

---

### `POST /examples/:id`

Load a predefined example document set. Place documents under `server/examples/<id>/`.

**Response:** Same shape as `/upload`.

---

### `GET /health`

```json
{ "status": "ok" }
```

---

## Agent Workflow

```
User question
      │
      ▼
┌─────────────────────────────────────────────────────┐
│ 1. Relevance Check                                  │
│    Is this question answerable from the document?   │
│    CAN_ANSWER / PARTIAL → continue                  │
│    NO_MATCH → return "not in scope" immediately     │
└──────────────────────────┬──────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────┐
│ 2. Hybrid Retrieval                                 │
│    BM25 (keyword) + Vector search (semantic)        │
│    Top-k chunks from ChromaDB + BM25 index          │
└──────────────────────────┬──────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────┐
│ 3. Research Agent                                   │
│    GPT-4o-mini generates an initial answer          │
│    grounded in retrieved chunks                     │
└──────────────────────────┬──────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────┐
│ 4. Verification Agent                               │
│    Checks: factual support · unsupported claims ·   │
│    contradictions · relevance                       │
│                                                     │
│    PASS → return final answer + report              │
│    FAIL → re-retrieve + re-research (max 3×)        │
└─────────────────────────────────────────────────────┘
```

---

## Supported File Types

| Format | Extension | Parser |
|---|---|---|
| PDF | `.pdf` | Docling |
| Word | `.docx` | Docling |
| Plain text | `.txt` | Docling |
| Markdown | `.md` | Docling |

Maximum total upload size: **50 MB**

---

## Environment Variables

### Server (`server/.env`)

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | — | **Required.** OpenAI API key |
| `CHROMA_DB_PATH` | `./chroma_db` | ChromaDB persistence directory |
| `VECTOR_SEARCH_K` | `5` | Number of vector search results |
| `CACHE_DIR` | `./.cache` | Processed document cache directory |

### Client (`client/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Flask API base URL |

---

## License

MIT
