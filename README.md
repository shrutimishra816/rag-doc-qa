# 📚 DocMind — RAG Document Q&A System

> Upload any PDF and ask questions in plain English. Powered by LangChain, ChromaDB, and OpenAI GPT-3.5.

![Tech Stack](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![LangChain](https://img.shields.io/badge/LangChain-0.2-1C3C3C?style=flat-square)
![ChromaDB](https://img.shields.io/badge/ChromaDB-0.5-orange?style=flat-square)

---

## 🏗️ Architecture

```
User uploads PDF
      │
      ▼
PyPDFLoader → RecursiveCharacterTextSplitter (500 tokens, 50 overlap)
      │
      ▼
OpenAI text-embedding-ada-002 → ChromaDB (persisted vector store)
      │
User asks question
      │
      ▼
Semantic similarity search (top-k=3 chunks retrieved)
      │
      ▼
GPT-3.5-turbo with custom RAG prompt → Answer + Source references
      │
      ▼
FastAPI response → React UI with expandable source cards
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- An [OpenAI API key](https://platform.openai.com/api-keys)

### 1. Clone the repo
```bash
git clone https://github.com/shrutimishra816/rag-doc-qa.git
cd rag-doc-qa
```

### 2. Backend setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate      # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Start the server
uvicorn main:app --reload --port 8000
```

Backend will be live at: `http://localhost:8000`  
API docs: `http://localhost:8000/docs`

### 3. Frontend setup
```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend will be live at: `http://localhost:5173`

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Check if backend is running and documents are loaded |
| `POST` | `/upload` | Upload a PDF file (multipart/form-data) |
| `POST` | `/ask` | Ask a question, get answer + sources |
| `DELETE` | `/clear` | Clear all documents from vector store |

### Example: Upload a PDF
```bash
curl -X POST http://localhost:8000/upload \
  -F "file=@my_document.pdf"
```

### Example: Ask a question
```bash
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the key findings?", "k": 3}'
```

---

## 📁 Project Structure

```
rag-doc-qa/
├── backend/
│   ├── main.py          # FastAPI app — /upload, /ask, /clear, /health
│   ├── ingest.py        # PDF parsing, chunking, embedding → ChromaDB
│   ├── retriever.py     # Semantic search + LLM answer chain
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Root layout
│   │   ├── main.jsx             # React entry point
│   │   ├── index.css            # Global styles + design tokens
│   │   └── components/
│   │       ├── UploadBox.jsx    # Drag-and-drop PDF uploader
│   │       ├── ChatWindow.jsx   # Q&A chat interface
│   │       └── SourceCard.jsx   # Expandable source reference cards
│   ├── index.html
│   ├── vite.config.js
│   └── tailwind.config.js
├── data/                # Sample PDFs for testing
├── evaluation.ipynb     # RAG pipeline evaluation notebook
├── .gitignore
└── README.md
```

---

## 🧪 Evaluation

Run the evaluation notebook to benchmark retrieval quality:

```bash
pip install jupyter ragas
jupyter notebook evaluation.ipynb
```

The notebook tests 20 questions and measures:
- Answer relevance by chunk size (500 vs 1000 tokens)
- Retrieval accuracy
- Response latency

**Key finding:** Chunk size 500 with 50-token overlap outperformed 1000-token chunks for dense academic documents, reducing off-topic retrievals by ~22%.

---

## ☁️ Deployment

### Backend → [Render.com](https://render.com) (free tier)
1. Push to GitHub
2. Create new Web Service on Render
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add `OPENAI_API_KEY` in Environment Variables

### Frontend → [Vercel](https://vercel.com) (free)
1. Import GitHub repo on Vercel
2. Set root directory to `frontend`
3. Add `VITE_API_URL=https://your-render-url.com` as environment variable
4. Deploy

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| PDF Parsing | LangChain `PyPDFLoader` |
| Text Splitting | `RecursiveCharacterTextSplitter` |
| Embeddings | OpenAI `text-embedding-ada-002` |
| Vector Store | ChromaDB (local persistence) |
| LLM | OpenAI GPT-3.5-turbo |
| Orchestration | LangChain `RetrievalQA` |
| Backend | FastAPI + Uvicorn |
| Frontend | React 18 + Vite + Tailwind CSS |
| Deployment | Render + Vercel |

---

## 💡 Key Design Decisions

- **Chunk size 500** — Empirically better for dense documents than 1000-token chunks (see evaluation notebook)
- **Custom RAG prompt** — Instructs the LLM to answer only from retrieved context, reducing hallucinations
- **Source references** — Every answer includes expandable source cards with page number and snippet
- **Collection-based isolation** — Each upload session uses a named ChromaDB collection, enabling multi-user support
- **Temp file cleanup** — Uploaded PDFs are deleted from disk after ingestion; only embeddings persist

---

## 📄 License

MIT — feel free to use this project as a portfolio piece or starting point.
