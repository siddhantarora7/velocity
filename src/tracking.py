# Smooth frames to ensure reliable distance between pixels and more accurate speed
# Kalman filter

import numpy as np
from filterpy.kalman import KalmanFilter
from filterpy.kalman import Q_discrete_white_noise

def clean(frames, fps):
    dt = 1 / fps
    st = next(i for i, f in enumerate(frames) if f[1] is not None)
    frames = frames[st:]

    kf = KalmanFilter(dim_x = 4, dim_z = 2)
    kf.F = np.array([[1, 0, dt, 0], [0, 1, 0, dt], [0, 0, 1, 0], [0, 0, 0, 1]])
    kf.H = np.array([[1, 0, 0, 0], [0, 1, 0, 0]])
    kf.R = np.eye(2) * 9 # measurement noise
    kf.P = np.diag([10, 10, 1000, 1000])

    # Start at first frame, where v = 0
    first = frames[0]
    kf.x = np.array([first[1], first[2], 0, 0], dtype = float)

    res = []
    for idx, cx, cy in frames:
        kf.predict() # Run the Kalman Filter!
        if cx is not None:
            kf.update([cx, cy])
        out.append((idx, float(kf.x[0]), float(kf.x[1])))
    
    return out