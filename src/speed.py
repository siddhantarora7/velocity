# Turns position/time into a velocity
# pixel_distance * fps / frame_gap = pixel_speed

import cv2
import math
import numpy as np
from ultralytics import YOLO
from src.pipeline import run_detection
from src.calibration import compute_scale


def compute_speeds(frames, fps, meters_per_pixel=1.0, window = None):
    speeds, t, xs, ys = [], [], [], []
    for i in range(len(frames) - 1):
        center1, center2 = frames[i], frames[i + 1]
        cx1, cy1, cx2, cy2 = center1[1], center1[2], center2[1], center2[2]
        idx1, idx2 = center1[0], center2[0]
        time = (idx2 - idx1) / fps
        distance = math.sqrt((cx1 - cx2)**2 + (cy1 - cy2)**2) # Euclidean distance
        pixel_speed = distance / time
        real_speed = pixel_speed * meters_per_pixel * 3.6 # Returns km/h
        speeds.append((idx2 / fps, real_speed))
    
    launch_speed = None
    if window is not None:
        start, end = window
        seg = frames[start:end + 1]
        if end - start + 1 >= 3:
            t, xs, ys = [f[0] / fps for f in seg], [f[1] for f in seg], [f[2] for f in seg]
            a, b, c = np.polyfit(t, ys, 2) # Get the quadratuc for ball trajectory
            vx0, vy0 = np.polyfit(t, xs, 1)[0], 2 * a * t[0] + b
            launch_speed = math.sqrt(vx0*vx0 + vy0*vy0) * meters_per_pixel * 3.6 #km/h
    
    return {"speeds": speeds, "launch": launch_speed}

if __name__ == "__main__":
    from src.tracking import clean
    from src.kick import kick

    model = YOLO("yolov8n.pt")
    point1, point2, distance_m = (100, 400), (700, 400), 7.32
    meters_per_pixel = compute_scale(point1, point2, distance_m)

    frames, fps = run_detection("data/input/velocity_test.mp4", "data/output/output_test.mp4", model, 0.25)
    smooth = clean(frames, fps) # Smooth first
    window = kick(smooth, fps)
    res = compute_speeds(frames, fps, meters_per_pixel, window)
    print('Fastest:', max(res["speeds"], key = lambda x: x[1]))
    print('Launch', res["launch"])
