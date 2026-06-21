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

VIDEOS: dict[str, str] = {}
JOBS: dict[str, dict] = {}

