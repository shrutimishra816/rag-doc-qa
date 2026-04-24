"""
retriever.py — RAG Retrieval + Answer Chain
Uses OpenAI SDK directly to avoid LangChain proxies conflict.
"""

import os
from dotenv import load_dotenv
from openai import OpenAI
from langchain_chroma import Chroma
from langchain.embeddings.base import Embeddings
from langchain.schema import Document

load_dotenv()

CHROMA_DB_DIR = os.getenv("CHROMA_DB_DIR", "./chroma_db")
OPENAI_MODEL  = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")

RAG_SYSTEM_PROMPT = """You are a helpful document assistant. Use ONLY the provided context to answer questions.
If the answer is not in the context, say "I couldn't find that in the uploaded document."
Be concise and accurate."""


class DirectOpenAIEmbeddings(Embeddings):
    """Calls OpenAI embeddings API directly — avoids LangChain proxies bug."""

    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model  = "text-embedding-ada-002"

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        texts    = [t.replace("\n", " ") for t in texts]
        response = self.client.embeddings.create(input=texts, model=self.model)
        return [item.embedding for item in response.data]

    def embed_query(self, text: str) -> list[float]:
        return self.embed_documents([text])[0]


def get_embeddings():
    return DirectOpenAIEmbeddings()


def get_answer(query: str, collection_name: str = "default", k: int = 3) -> dict:
    # 1. Retrieve relevant chunks from ChromaDB
    vectorstore = Chroma(
        persist_directory=CHROMA_DB_DIR,
        embedding_function=get_embeddings(),
        collection_name=collection_name,
    )
    docs = vectorstore.similarity_search(query, k=k)

    # 2. Build context string
    context = "\n\n".join([doc.page_content for doc in docs])

    # 3. Call OpenAI directly — no LangChain chain needed
    client   = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        temperature=0,
        messages=[
            {"role": "system", "content": RAG_SYSTEM_PROMPT},
            {"role": "user",   "content": f"Context:\n{context}\n\nQuestion: {query}"},
        ],
    )
    answer = response.choices[0].message.content

    # 4. Format sources
    sources = []
    seen    = set()
    for doc in docs:
        page     = doc.metadata.get("page", 0) + 1
        filename = doc.metadata.get("source_file", "document")
        snippet  = doc.page_content[:300].strip()
        key      = (page, filename)
        if key not in seen:
            seen.add(key)
            sources.append({"page": page, "filename": filename, "snippet": snippet})

    return {"answer": answer, "sources": sources, "query": query}


def collection_exists(collection_name: str = "default") -> bool:
    try:
        vectorstore = Chroma(
            persist_directory=CHROMA_DB_DIR,
            embedding_function=get_embeddings(),
            collection_name=collection_name,
        )
        return vectorstore._collection.count() > 0
    except Exception:
        return False
