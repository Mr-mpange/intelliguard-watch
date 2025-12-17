# IntelliGuard ML Backend

A FastAPI-based backend for cyber attack detection using machine learning models trained on the CICIDS2017 dataset.

## Features

- **Multi-Model Attack Detection**: Random Forest, XGBoost for known attacks
- **Zero-Day Detection**: Isolation Forest for anomaly detection
- **Real-time Prediction API**: RESTful endpoints for traffic analysis
- **WebSocket Support**: Real-time threat streaming
- **Docker Ready**: Easy deployment with Docker

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Train Models (First Time Only)

```bash
python train_models.py
```

### 3. Run the Server

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Docker Deployment

```bash
docker build -t intelliguard-backend .
docker run -p 8000:8000 intelliguard-backend
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | System health check |
| `/predict` | POST | Analyze traffic logs |
| `/predict/batch` | POST | Batch prediction |
| `/ws/realtime` | WS | Real-time threat stream |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MODEL_PATH` | Path to trained models | `./models` |
| `API_KEY` | API authentication key | Required |
| `CORS_ORIGINS` | Allowed CORS origins | `*` |

## Dataset

This system uses the [CICIDS2017 dataset](https://www.unb.ca/cic/datasets/ids-2017.html) for training.
Download and place in `data/` directory before training.
