"""
retriever.py — RAG Retrieval + Answer Chain
"""

import os
import httpx
from dotenv import load_dotenv

from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_chroma import Chroma
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate

load_dotenv()

CHROMA_DB_DIR = os.getenv("CHROMA_DB_DIR", "./chroma_db")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")

RAG_PROMPT_TEMPLATE = """You are a helpful document assistant. Use ONLY the context below to answer the question.
If the answer is not in the context, say "I couldn't find that in the uploaded document."
Always be concise and accurate. Reference specific parts of the document when possible.

Context:
{context}

Question: {question}

Answer:"""

RAG_PROMPT = PromptTemplate(
    template=RAG_PROMPT_TEMPLATE,
    input_variables=["context", "question"],
)


def get_embeddings():
    return OpenAIEmbeddings(
        model="text-embedding-ada-002",
        http_client=httpx.Client(),
    )


def get_llm():
    return ChatOpenAI(
        model=OPENAI_MODEL,
        temperature=0,
        http_client=httpx.Client(),
    )


def get_answer(query: str, collection_name: str = "default", k: int = 3) -> dict:
    embeddings = get_embeddings()
    vectorstore = Chroma(
        persist_directory=CHROMA_DB_DIR,
        embedding_function=embeddings,
        collection_name=collection_name,
    )

    retriever = vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={"k": k},
    )

    llm = get_llm()

    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        return_source_documents=True,
        chain_type_kwargs={"prompt": RAG_PROMPT},
    )

    result = qa_chain.invoke({"query": query})

    sources = []
    seen = set()
    for doc in result["source_documents"]:
        page = doc.metadata.get("page", 0) + 1
        filename = doc.metadata.get("source_file", "document")
        snippet = doc.page_content[:300].strip()
        key = (page, filename)
        if key not in seen:
            seen.add(key)
            sources.append({
                "page": page,
                "filename": filename,
                "snippet": snippet,
            })

    return {
        "answer": result["result"],
        "sources": sources,
        "query": query,
    }


def collection_exists(collection_name: str = "default") -> bool:
    try:
        embeddings = get_embeddings()
        vectorstore = Chroma(
            persist_directory=CHROMA_DB_DIR,
            embedding_function=embeddings,
            collection_name=collection_name,
        )
        count = vectorstore._collection.count()
        return count > 0
    except Exception:
        return False
