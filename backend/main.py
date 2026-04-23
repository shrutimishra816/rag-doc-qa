"""
main.py — FastAPI Application
Exposes /upload, /ask, /clear, and /health endpoints.
Run with: uvicorn main:app --reload
"""

import os
import shutil
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from ingest import ingest_pdf, clear_collection
from retriever import get_answer, collection_exists

load_dotenv()

# ── App setup ──────────────────────────────────────────────────────────────────
app = FastAPI(
    title="RAG Document Q&A API",
    description="Upload PDFs and ask questions — powered by LangChain + ChromaDB + OpenAI",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("./uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# ── Request/Response Models ────────────────────────────────────────────────────

class AskRequest(BaseModel):
    question: str
    collection_name: Optional[str] = "default"
    k: Optional[int] = 3

class AskResponse(BaseModel):
    answer: str
    sources: list
    query: str

class UploadResponse(BaseModel):
    message: str
    filename: str
    page_count: int
    chunk_count: int
    collection_name: str

class HealthResponse(BaseModel):
    status: str
    has_documents: bool
    collection_name: str


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
def health_check(collection_name: str = "default"):
    """Check API health and whether documents have been uploaded."""
    return {
        "status": "ok",
        "has_documents": collection_exists(collection_name),
        "collection_name": collection_name,
    }


@app.post("/upload", response_model=UploadResponse)
async def upload_pdf(
    file: UploadFile = File(...),
    collection_name: str = "default",
):
    """
    Upload a PDF file and ingest it into ChromaDB.
    Supports multiple uploads to the same collection (multi-document Q&A).
    """
    # Validate file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    # Validate file size (max 20MB)
    MAX_SIZE = 20 * 1024 * 1024
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 20MB.")

    # Save file temporarily
    safe_name = f"{uuid.uuid4()}_{file.filename}"
    save_path = UPLOAD_DIR / safe_name
    with open(save_path, "wb") as f:
        f.write(content)

    try:
        result = ingest_pdf(str(save_path), collection_name=collection_name)
    except Exception as e:
        save_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")
    finally:
        save_path.unlink(missing_ok=True)  # Clean up temp file

    return {
        "message": "PDF ingested successfully.",
        "filename": file.filename,
        "page_count": result["page_count"],
        "chunk_count": result["chunk_count"],
        "collection_name": result["collection_name"],
    }


@app.post("/ask", response_model=AskResponse)
def ask_question(body: AskRequest):
    """
    Ask a question against the uploaded documents.
    Returns an answer grounded in the document content, plus source references.
    """
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    if not collection_exists(body.collection_name):
        raise HTTPException(
            status_code=404,
            detail="No documents found. Please upload a PDF first.",
        )

    try:
        result = get_answer(
            query=body.question,
            collection_name=body.collection_name,
            k=body.k,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")

    return result


@app.delete("/clear")
def clear_documents(collection_name: str = "default"):
    """
    Delete all documents from a ChromaDB collection.
    Useful when the user wants to start fresh with a new document set.
    """
    try:
        clear_collection(collection_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clear failed: {str(e)}")

    return {"message": f"Collection '{collection_name}' cleared successfully."}


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
