# Turns position/time into a velocity
# pixel_distance * fps / frame_gap = pixel_speed

import cv2
import math
import numpy as np
from ultralytics import YOLO
from src.pipeline import run_detection
from src.calibration import compute_scale


def compute_speeds(frames, fps, meters_per_pixel=1.0, window = None):
    # Speeds come from real detections only: Kalman-predicted positions lag a
    # sudden kick and underestimate the peak. `window` is an inclusive
    # (start_frame_idx, end_frame_idx) range of the kick.
    detected = [f for f in frames if f[1] is not None]
    speeds = []
    for i in range(len(detected) - 1):
        (idx1, cx1, cy1), (idx2, cx2, cy2) = detected[i], detected[i + 1]
        time = (idx2 - idx1) / fps
        distance = math.sqrt((cx1 - cx2)**2 + (cy1 - cy2)**2) # Euclidean distance
        pixel_speed = distance / time
        real_speed = pixel_speed * meters_per_pixel * 3.6 # Returns km/h
        speeds.append((idx2 / fps, real_speed))

    launch_speed = None
    if window is not None:
        start, end = window
        seg = [f for f in detected if start <= f[0] <= end]
        if len(seg) >= 3:
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

    frames, fps = run_detection("data/input/velocity_test.mp4", model, 0.25)
    smooth = clean(frames, fps) # Smooth first
    window = kick(smooth, fps)
    if window is not None:
        window = (smooth[window[0]][0], smooth[window[1]][0]) # list indices -> frame indices
    res = compute_speeds(frames, fps, meters_per_pixel, window)
    print('Fastest:', max(res["speeds"], key = lambda x: x[1]))
    print('Launch', res["launch"])
