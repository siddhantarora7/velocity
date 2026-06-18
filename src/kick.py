import math

def kick(smooth, fps, thres, k):
    first = -1

    for i in range(len(smooth) - 1):
        idx1, x1, cy1 = smooth[i]
        idx2, x2, cy2 = smooth[i + 1]
        pixel_distance = math.sqrt((x2 - x1)**2 + (y2 - y1)**2)
        dt = (idx2 - idx1)/fps
        pixel_speed = pixel_distance/dt
        
        if pixel_speed >= threshold:
            if first == -1:
                first = i
            if i - first + 1 == k:
                return (first, i)
        else:
            first = -1
        
if __name__ == "__main__":
    from ultralytics import YOLO
    from pipeline import run_detection
    from tracking import clean

    model = YOLO("yolov8n.pt")
    frames, fps = run_detection("data/input/velocity_test.mp4", "data/output/output_test.mp4", model, 0.25)
    smooth = clean(frames, fps)
    
    res = kick(smooth, fps)

    if res is None:
        print("No kick detected")
    else:
        print('Output:', res)
