# Return the correct scale given distance between two user-selected points for accurate speed retrieval

from math import sqrt

def compute_scale(point1, point2, distance_m):
    if point1 == point2:
        raise ValueError("Points must be distinct!")
    x1, y1 = point1
    x2, y2 = point2
    pixel_distance = sqrt((x2 - x1)**2 + (y2 - y1)**2)
    return distance_m/pixel_distance

if __name__ == "__main__":
    point1 = (100, 400)
    point2 = (700, 400)
    distance_m = 7.32
    print(compute_scale(point1, point2, distance_m))