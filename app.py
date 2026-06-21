# FastAPI backend
# Measure soccer ball kick speed from an uploaded video
# Wraps the Python pipeline, which is as follows: upload -> calibrate (two-click scale) -> detect -> smooth -> find kick -> measure speed

import os
import uuid
import traceback
import tempfile
import cv2
from enum import Enum
from ultralytics import YOLO

import FastAPI

from src.pipeline import run_detection
from src.tracking import clean
from src.kick import kick
from src.speed import compute_speeds
from src.calibration import compute_scale

