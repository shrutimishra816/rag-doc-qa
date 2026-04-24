"""
ingest.py — PDF Ingestion Pipeline
Uses OpenAI SDK directly for embeddings to avoid LangChain proxies conflict.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain.embeddings.base import Embeddings

load_dotenv()

CHROMA_DB_DIR = os.getenv("CHROMA_DB_DIR", "./chroma_db")
CHUNK_SIZE    = int(os.getenv("CHUNK_SIZE", 500))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 50))


class DirectOpenAIEmbeddings(Embeddings):
    """Calls OpenAI embeddings API directly — avoids LangChain proxies bug."""

    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model  = "text-embedding-ada-002"

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        texts   = [t.replace("\n", " ") for t in texts]
        response = self.client.embeddings.create(input=texts, model=self.model)
        return [item.embedding for item in response.data]

    def embed_query(self, text: str) -> list[float]:
        return self.embed_documents([text])[0]


def get_embeddings():
    return DirectOpenAIEmbeddings()


def ingest_pdf(file_path: str, collection_name: str = "default") -> dict:
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {file_path}")

    loader     = PyPDFLoader(str(path))
    pages      = loader.load()
    page_count = len(pages)

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(pages)

    for chunk in chunks:
        chunk.metadata["source_file"] = path.name

    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=get_embeddings(),
        persist_directory=CHROMA_DB_DIR,
        collection_name=collection_name,
    )

    return {
        "chunk_count":     len(chunks),
        "page_count":      page_count,
        "collection_name": collection_name,
        "filename":        path.name,
    }


def clear_collection(collection_name: str = "default") -> bool:
    vectorstore = Chroma(
        persist_directory=CHROMA_DB_DIR,
        embedding_function=get_embeddings(),
        collection_name=collection_name,
    )
    vectorstore.delete_collection()
    return True
