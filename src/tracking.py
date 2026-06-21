# Smooth frames to ensure reliable distance between pixels and more accurate speed
# Kalman filter

import numpy as np
from ultralytics import YOLO
from filterpy.kalman import KalmanFilter
from filterpy.common import Q_discrete_white_noise
from src.pipeline import run_detection


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
    import matplotlib.pyplot as plt

    model = YOLO("yolov8n.pt")
    frames, fps = run_detection("data/input/velocity_test.mp4", "data/output/output_test.mp4", model, 0.25)
    smooth = clean(frames, fps)

    # debug
    raw_idx, raw_x, raw_y = [x[0] for x in frames if x[1] is not None], [x[1] for x in frames if x[1] is not None], [x[2] for x in frames if x[2] is not None]
    smooth_idx, smooth_x, smooth_y = [x[0] for x in smooth if x[1] is not None], [x[1] for x in smooth if x[1] is not None], [x[2] for x in frames if x[2] is not None]
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 8), sharex = True)
    ax1.scatter(raw_idx, raw_x, s = 18, c = "red", label = "Raw X", zorder = 3)
    ax1.plot(smooth_idx, smooth_x, c = "blue", label = "Smooth X")
    ax1.set_ylabel("X (px)")
    ax1.legend()
    ax1.grid(alpha = 0.3)

    ax2.scatter(raw_idx, raw_y, s = 18, c = "red", label = "Raw Y", zorder = 3)
    ax2.plot(smooth_idx, smooth_y, c = "blue", label = "Smooth Y")
    ax2.set_ylabel("Y (px)")
    ax2.set_xlabel("Frame index")
    ax2.legend()
    ax2.grid(alpha = 0.3)

    plt.tight_layout()
    plt.savefig("data/output/tracking_debug.png", dpi = 120)
    print("Image saved!")
    
    # Test
    print(f"input frames: {len(frames)}, output frames: {len(smooth)}")
    print(smooth[:5])
