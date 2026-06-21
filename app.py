# FastAPI backend
# Measure soccer ball kick speed from an uploaded video
# Wraps the Python pipeline, which is as follows: upload -> calibrate (two-click scale) -> detect -> smooth -> find kick -> measure speed

import os
import uuid
import traceback
import tempfile
import cv2
from enum import Enum
from ultralytics import YOLO

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from src.pipeline import run_detection
from src.tracking import clean
from src.kick import kick
from src.speed import compute_speeds
from src.calibration import compute_scale

app = FastAPI(title = "Velocity API", version = "0.1.0")

app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://localhost:3000"], allow_methods = ["*"], allow_headers = ["*"])

MODEL = YOLO("yolov8n.pt") # Load model globally
STORAGE = os.path.join(tempfile.gettempdir(), "velocity storage")
os.makedirs(STORAGE, exist_ok = True)

# In-memory Stores

VIDEOS = {}
JOBS = {}

class AnalyzeRequest(BaseModel):
    video_id: str
    point1: Point
    point2: Point
    distance_m: float

# FastAPI Endpoints

@app.post("/upload", response_model=UploadResponse) # Filter data through UploadResponse
async def upload_video(file: UploadFile = File(...)):
    # Store an uploaded video and return dimensions
    if file.content_type is None or not file.content_type.startswith("video/"):
        raise HTTPException(status_code = 400, detail = "Please upload a video file!")
    
    video_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename or "")[1] or ".mp4"
    path = os.path.join(STORAGE, f"{video_id}{ext}") # Like tmp/velocity_storage/....mp4

    with open(path, "wb") as f:
        f.write(await file.read())
    
    cap = cv2.VideoCapture(path)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()

    VIDEOS[video_id] = path
    return {"video_id": video_id, "width": width, "height": height}



