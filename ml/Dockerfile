FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN python demo_data.py && python train.py demo.csv --provenance "Synthetic conversion demonstration" && python demo_sentiment.py && python sentiment.py demo_sentiment.csv --provenance "Synthetic sentiment demonstration"
EXPOSE 8000
CMD ["sh","-c","uvicorn api:app --host 0.0.0.0 --port ${PORT:-8000}"]
