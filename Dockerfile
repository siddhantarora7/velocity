FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# System libs OpenCV (headless) needs to decode video. ffmpeg covers the codecs.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libglib2.0-0 \
        ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install CPU-only PyTorch FIRST so ultralytics doesn't drag in the multi-GB
# CUDA build. This is the whole reason the Vercel bundle was 5.4 GB.
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install -r requirements.txt

# Bake the YOLO weights into the image so there's no download on cold start.
# (yolov8n.pt is gitignored, so we fetch it at build time instead of COPYing.)
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"

COPY app.py ./
COPY src ./src

# HF Spaces routes to 7860; Render injects its own $PORT which overrides this.
EXPOSE 7860
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-7860}"]
