from ultralytics import YOLO
import cv2

def detect_ball(frame, model, conf):
    results = model(frame, verbose=False)[0]
    best_conf, best_cx, best_cy = None, None, None

    for box in results.boxes:
        c = float(box.conf[0])
        if c <= conf or int(box.cls[0]) != 32: # 32 is the class index here for YOLo to detect the ball
            continue
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
        if best_conf is None or c > best_conf:
            best_conf = c
            best_cx = cx
            best_cy = cy
    if best_cx is None:
        return None
    return best_cx, best_cy

if __name__ == "__main__":
    model = YOLO("yolov8n.pt")
    cap = cv2.VideoCapture("data/input/velocity_test.mp4")
    ret, frame = cap.read()

    if not ret:
        print("Error: Could not read frame")
        exit()

    center = detect_ball(frame, model, 0.25)
    if center is None:
        print("Error: Could not detect ball")
        exit()
    else:
        cv2.circle(frame, (int(center[0]), int(center[1])), 5, (0, 0, 255), -1)
        cv2.imshow("Frame", frame)
        cv2.waitKey(0)
        cv2.destroyAllWindows()
