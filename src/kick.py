import math
import statistics

def kick(smooth, fps, k = 3, window = 5, floor = 200):
    first, speeds = -1, []

    for i in range(len(smooth) - 1):
        idx1, x1, y1 = smooth[i]
        idx2, x2, y2 = smooth[i + 1]
        pixel_distance = math.sqrt((x2 - x1)**2 + (y2 - y1)**2)
        dt = (idx2 - idx1)/fps
        pixel_speed = pixel_distance/dt
        speeds.append(pixel_speed)
        
    if not speeds:
        return None
    
    base = statistics.median(speeds)
    thres = max(2.5 * base, floor)

    for i in range(len(smooth) - 1):
        idx1, x1, y1 = smooth[i]
        idx2, x2, y2 = smooth[i + 1]
        pixel_distance = math.sqrt((x2 - x1)**2 + (y2 - y1)**2)
        dt = (idx2 - idx1)/fps
        pixel_speed = pixel_distance/dt
        
        if pixel_speed >= thres:
            if first == -1:
                first = i
            if i - first + 1 >= k:
                return (first, min(len(smooth) - 1, first + window))
        else:
            first = -1
        
    return None
        
if __name__ == "__main__":
    from ultralytics import YOLO
    from src.pipeline import run_detection
    from src.tracking import clean

    model = YOLO("yolov8n.pt")
    frames, fps = run_detection("data/input/velocity_test.mp4", "data/output/output_test.mp4", model, 0.25)
    smooth = clean(frames, fps)
    
    res = kick(smooth, fps)

    if res is None:
        print("No kick detected")
    else:
        print("list indices:", res)
        print("kick frame idx:", smooth[res[0]][0], "→", smooth[res[1]][0])
        for i in range(max(0, res[0]-4), res[0]+2):
            print(i, "frame", smooth[i][0], "→", smooth[i+1][0])