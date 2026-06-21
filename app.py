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

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
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
STORAGE = os.path.join(tempfile.gettempdir(), "velocity_storage")
os.makedirs(STORAGE, exist_ok = True)

# In-memory Stores

VIDEOS = {}
JOBS = {}

class AnalyzeRequest(BaseModel):
    video_id: str
    point1: list[float] # (x, y)
    point2: list[float]
    distance_m: float

# FastAPI Endpoints

@app.post("/upload") # Filter data through UploadResponse
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

@app.get("/frame/{video_id}")
async def frame(video_id: str):
    path = VIDEOS.get(video_id)
    if not path:
        raise HTTPException(404, "Unknown Video ID")
    cap = cv2.VideoCapture(path)
    ok, img = cap.read()
    cap.release()
    
    if not ok:
        raise HTTPException(500, "Unable to read frame")

    frame_path = os.path.join(STORAGE, f"{video_id}_frame.jpg")
    cv2.imwrite(frame_path, img)
    return FileResponse(frame_path, media_type="image/jpeg")

# Main logic which runs the given video on the pipeline
def _run(job_id, path, p1, p2, distance_m):
    try:
        JOBS[job_id]["status"] = "running"
        mpp = compute_scale(p1, p2, distance_m) # Meters/pixel
        out = os.path.join(STORAGE, f"{job_id}_output.mp4")
        frames, fps = run_detection(path, out, MODEL, 0.25)
        smooth = clean(frames, fps)
        window = kick(smooth, fps)
        res = compute_speeds(smooth, fps, mpp, window)
        fastest_t, fastest_kmh = max(res["speeds"], key = lambda x: x[1])
        JOBS[job_id].update({
            "status": "done",
            "video": out,
            "result": {
                "fastest_kmh": fastest_kmh,
                "launch_kmh": res["launch"],
                "kick_found": window is not None,
                "speeds": res["speeds"],
            },
        })
    except Exception:
        JOBS[job_id].update({"status": "error", "error": traceback.format_exc()})

@app.post("/analyze")
async def analyze(req: AnalyzeRequest, bg: BackgroundTasks):
    path = VIDEOS.get(req.video_id)
    if not path:
        raise HTTPException(404, "Unknown Video ID")
    job_id = str(uuid.uuid4())
    JOBS[job_id] = {"status": "pending"}
    bg.add_task(_run, job_id, path, req.point1, req.point2, req.distance_m)
    return {"job_id": job_id} # Return job_id so frontend can check for completion

@app.get("/status/{job_id}")
async def status(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "Unknown Job ID")
    return {"status": job["status"], "error": job.get("error")} # Return to frontend poll

@app.get("/result/{job_id}")
async def result(job_id: str):
    job = JOBS.get(job_id)
    if not job or job["status"] != "done":
        raise HTTPException(409, "Not Done")
    return job["result"]

# Return output video
@app.get("/video/{job_id}")
async def video(job_id: str):
    job = JOBS.get(job_id)
    if not job or not job.get("video"):
        raise HTTPException(404, "No Video")
    return FileResponse(job["video"], media_type = "video/mp4")