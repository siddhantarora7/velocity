# FastAPI backend
# Measure soccer ball kick speed from an uploaded video
# Wraps the Python pipeline, which is as follows: upload -> calibrate (two-click scale) -> detect -> smooth -> find kick -> measure speed

import os
import uuid
import traceback
import tempfile
import cv2
from ultralytics import YOLO

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.db import get_db, User, Shot, SessionLocal
from src.auth import hash_password, verify_password, create_token, decode_token
from src.pipeline import run_detection
from src.kick import kick
from src.speed import compute_speeds
from src.calibration import compute_scale

app = FastAPI(title = "Velocity API", version = "0.1.0")

_DEFAULT_ORIGINS = "http://localhost:5173,http://localhost:3000"
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", _DEFAULT_ORIGINS).split(",") if o.strip()]

app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_methods = ["*"], allow_headers = ["*"])

MODEL = YOLO("yolov8n.pt") # Load model globally
STORAGE = os.path.join(tempfile.gettempdir(), "velocity_storage")
os.makedirs(STORAGE, exist_ok = True)

# In-memory Stores

VIDEOS = {}
JOBS = {}

class SignupRequest(BaseModel):
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class AnalyzeRequest(BaseModel):
    video_id: str
    point1: list[float] # (x, y)
    point2: list[float]
    distance_m: float

# Parse a "Bearer <token>" header tolerantly (case-insensitive scheme, extra
# whitespace ok) and return the matching User, or None if anything is off.
def _user_from_auth(authorization, db: Session):
    if not authorization:
        return None
    parts = authorization.strip().split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    user_id = decode_token(parts[1])
    if user_id is None:
        return None
    return db.query(User).filter(User.id == user_id).first()

def current_user(authorization: str = Header(None), db: Session = Depends(get_db)) -> User:
    user = _user_from_auth(authorization, db)
    if user is None:
        raise HTTPException(401, "Not authenticated!")
    return user

# If user is not logged in, we can still store their shots
def current_user_2(authorization: str = Header(None), db: Session = Depends(get_db)):
    return _user_from_auth(authorization, db)


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
def _run(job_id, path, p1, p2, distance_m, user_id = None):
    try:
        JOBS[job_id]["status"] = "running"
        mpp = compute_scale(p1, p2, distance_m) # Meters/pixel
        frames, fps = run_detection(path, MODEL, 0.25)
        # Kick detection runs on real detections only: Kalman-smoothed tracks
        # lag the kick and pad the clip with phantom frames that skew the median.
        detected = [f for f in frames if f[1] is not None]
        window = kick(detected, fps)
        if window is not None:
            window = (detected[window[0]][0], detected[window[1]][0]) # list indices -> frame indices
        res = compute_speeds(frames, fps, mpp, window)
        fastest_t, fastest_kmh = res["top"]

        if user_id is not None:
            db = SessionLocal()
            try:
                shot = Shot(user_id = user_id, fastest_kmh = fastest_kmh, launch_kmh= res["launch"], 
                kick_found = window is not None,)
                db.add(shot)
                db.commit()
            finally:
                db.close()

        JOBS[job_id].update({
            "status": "done",
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
async def analyze(req: AnalyzeRequest, bg: BackgroundTasks, user=Depends(current_user_2)):
    path = VIDEOS.get(req.video_id)
    if not path:
        raise HTTPException(404, "Unknown Video ID")
    job_id = str(uuid.uuid4())
    JOBS[job_id] = {"status": "pending"}
    user_id = user.id if user else None
    bg.add_task(_run, job_id, path, req.point1, req.point2, req.distance_m, user_id)
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

@app.post("/signup")
async def signup(req: SignupRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(400, "Duplicate email")
    user = User(email=req.email, password_hash = hash_password(req.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"token": create_token(user.id)}

@app.post("/login")
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(401, "User not found")
    if not verify_password(req.password, user.password_hash):
        raise HTTPException(401, "Incorrect password")
    return {"token": create_token(user.id)}

@app.get("/shots")
async def list_shots(user: User = Depends(current_user), db: Session = Depends(get_db)):
    shots = db.query(Shot).filter(Shot.user_id == user.id).order_by(Shot.created_at.desc()).all()
    return [{
        "id": s.id,
        "fastest_kmh": s.fastest_kmh,
        "launch_kmh": s.launch_kmh,
        "kick_found": s.kick_found,
        "created_at": s.created_at.isoformat(),
    }
    for s in shots
    ]