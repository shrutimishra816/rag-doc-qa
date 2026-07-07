FROM python:3.11-slim

WORKDIR /app

# Install backend dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./

# Chroma vector store persists here (mount a volume in production)
ENV CHROMA_DB_DIR=/app/chroma_db
RUN mkdir -p /app/chroma_db

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
