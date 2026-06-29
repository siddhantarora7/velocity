from src.detection import detect_ball
from ultralytics import YOLO
import cv2

def run_detection(video_path, model, conf):
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    frames, idx = [], 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        idx += 1
        center = detect_ball(frame, model, conf)
        if center is None:
            frames.append((idx, None, None))
        else:
            cx, cy = int(center[0]), int(center[1])
            frames.append((idx, cx, cy))

        if idx % 30 == 0:
            print("Frame", idx)

    cap.release()

    return frames, fps

if __name__ == "__main__":
    model = YOLO("yolov8n.pt")
    run_detection("data/input/velocity_test.mp4", model, 0.25)
