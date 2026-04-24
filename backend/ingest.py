"""
ingest.py — PDF Ingestion Pipeline
"""

import os
from pathlib import Path
from dotenv import load_dotenv

from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from openai import OpenAI
from langchain_openai import OpenAIEmbeddings

load_dotenv()

CHROMA_DB_DIR = os.getenv("CHROMA_DB_DIR", "./chroma_db")
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 500))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 50))


def get_embeddings():
    """Create OpenAIEmbeddings with explicit http_client to avoid proxies issue."""
    import httpx
    http_client = httpx.Client()
    return OpenAIEmbeddings(
        model="text-embedding-ada-002",
        http_client=http_client,
    )


def ingest_pdf(file_path: str, collection_name: str = "default") -> dict:
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {file_path}")

    loader = PyPDFLoader(str(path))
    pages = loader.load()
    page_count = len(pages)

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(pages)

    for chunk in chunks:
        chunk.metadata["source_file"] = path.name

    embeddings = get_embeddings()
    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=CHROMA_DB_DIR,
        collection_name=collection_name,
    )

    return {
        "chunk_count": len(chunks),
        "page_count": page_count,
        "collection_name": collection_name,
        "filename": path.name,
    }


def clear_collection(collection_name: str = "default") -> bool:
    embeddings = get_embeddings()
    vectorstore = Chroma(
        persist_directory=CHROMA_DB_DIR,
        embedding_function=embeddings,
        collection_name=collection_name,
    )
    vectorstore.delete_collection()
    return True
