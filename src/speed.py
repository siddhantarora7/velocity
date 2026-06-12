# Turns position/time into a velocity
# pixel_distance * fps / frame_gap = pixel_speed

import cv2
from ultralytics import YOLO
from pipeline import run_detection
import math

def compute_speeds(frames, fps, meters_per_pixel=1.0):
    speeds = []
    for i in range(len(frames) - 1):
        center1, center2 = frames[i], frames[i + 1]
        cx1, cy1, cx2, cy2 = center1[1], center1[2], center2[1], center2[2]
        idx1, idx2 = center1[0], center2[0]
        time = (idx2 - idx1) / fps
        distance = math.sqrt((cx1 - cx2)**2 + (cy1 - cy2)**2) # Euclidean distance
        pixel_speed = distance / time
        real_speed = pixel_speed * meters_per_pixel * 3.6 # Returns km/h
        speeds.append((idx2, real_speed))
    
    return speeds

if __name__ == "__main__":
    model = YOLO("yolov8n.pt")
    frames, fps = run_detection("data/input/velocity_test.mp4", "data/output/output_test.mp4", model, 0.25)
    speeds = compute_speeds(frames, fps)
    print(max(speeds, key = lambda x: x[1]))