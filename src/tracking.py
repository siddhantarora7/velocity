# Smooth frames to ensure reliable distance between pixels and more accurate speed
# Kalman filter

import numpy as np
from ultralytics import YOLO
from filterpy.kalman import KalmanFilter
from filterpy.common import Q_discrete_white_noise
from pipeline import run_detection


def clean(frames, fps):
    dt = 1 / fps
    st = next(i for i, f in enumerate(frames) if f[1] is not None)
    frames = frames[st:]

    kf = KalmanFilter(dim_x = 4, dim_z = 2)
    kf.F = np.array([[1, 0, dt, 0], [0, 1, 0, dt], [0, 0, 1, 0], [0, 0, 0, 1]])
    kf.H = np.array([[1, 0, 0, 0], [0, 1, 0, 0]])
    kf.R = np.eye(2) * 9 # measurement noise
    kf.Q = Q_discrete_white_noise(dim = 2, dt = dt, var = 20.0, block_size = 2)
    kf.P = np.diag([10, 10, 1000, 1000])

    # Start at first frame, where v = 0
    first = frames[0]
    kf.x = np.array([first[1], first[2], 0, 0], dtype = float)

    res = []
    for idx, cx, cy in frames:
        kf.predict() # Run the Kalman Filter!
        if cx is not None:
            kf.update([cx, cy])
        res.append((idx, float(kf.x[0]), float(kf.x[1])))
    
    return res

if __name__ == "__main__":
    model = YOLO("yolov8n.pt")
    frames, fps = run_detection("data/input/velocity_test.mp4", "data/output/output_test.mp4", model, 0.25)
    smooth = clean(frames, fps)
    
    # Test
    print(f"input frames: {len(frames)}, output frames: {len(smooth)}")
    print(smooth[:5])
