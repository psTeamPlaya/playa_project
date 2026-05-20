import base64
import json
import redis
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from PIL import Image
import io
import time

from backend.engine_recomendation import cargar_playas

router = APIRouter(prefix="/api/review-photo", tags=["Review-Photo"])

redis_client = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)

import math
def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000 
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@router.post("/verify")
async def addReviewPhoto(
    img: UploadFile = File(...),
    lat: float = Form(...),
    lon: float = Form(...),
    beach_lat: float = Form(0.0),
    beach_lon: float = Form(0.0)
):
    
    MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB
    MAX_DIMENSION = 1024
    
    photo_bytes = await img.read()
    
    if len(photo_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large.")

    try:
        image = Image.open(io.BytesIO(photo_bytes))
        if image.format not in ["JPEG"]:
            raise HTTPException(status_code=400, detail="Incorrect data format.")
        print(image.width)
        print(image.height)
        if image.width - MAX_DIMENSION > 5 or image.height - MAX_DIMENSION > 5:
            raise HTTPException(status_code=400, detail="Invalid image dimensions.")
        
        if image.getexif():
            print(f"Warning: Photo with EXIF received from {lat}, {lon}")
            
    except Exception as e:
        print(f"Error processing image: {e}")
        raise HTTPException(status_code=400, detail="Corrupted image file.")
        
    all_beaches = cargar_playas()

    closest_beach = None
    min_dystans = float('inf')
    for p in all_beaches:
        d = calculate_distance(lat, lon, p["latitud"], p["longitud"])
        if d < min_dystans:
            min_dystans = d
            closest_beach = p
    if not closest_beach or min_dystans > 15000000:
        raise HTTPException(status_code=400, detail="Nie wykryto plaży w zasięgu 150m.")

    beach_id = closest_beach["id"]

    photo_base64 = base64.b64encode(photo_bytes).decode("utf-8")

    payload = {
        "user_lat": lat,
        "user_lon": lon,
        "beach_id": beach_id,
        "photo_base64": photo_base64,
        "timestamp": time.time()
    }
    redis_client.lpush("beach_photos_queue", json.dumps(payload))
    
    return {"status": "received", "message": "GPS valid. Photo queued for AI anti-spoofing verification."}

@router.get("/get-photos/{beach_id}")
async def get_beach_photos(beach_id: int):
    beach_key = f"beach_photos:{beach_id}"
    
    photos = redis_client.smembers(beach_key)
    
    if not photos:
        return {"photos": []}
    
    decoded_photos = [json.loads(p) for p in photos]
    
    return {"photos": decoded_photos}