from detection import detect_ball
from ultralytics import YOLO
import cv2

def run_detection(video_path, output_path, model, conf):
    cap = cv2.VideoCapture(video_path)
    fps, width, height = cap.get(cv2.CAP_PROP_FPS), int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    frames, idx = [], 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        idx += 1
        center = detect_ball(frame, model, conf)
        if center is not None:
            frames.append((idx, int(center[0]), int(center[1])))
            cv2.circle(frame, (int(center[0]), int(center[1])), 5, (0, 0, 255), -1)
        out.write(frame)

        if idx % 30 == 0:
            print("Frame", idx)
    
    cap.release()
    out.release()

if __name__ == "__main__":
    model = YOLO("yolov8n.pt")
    run_detection("data/input/velocity_test.mp4", "data/output/output_test.mp4", model, 0.25)
