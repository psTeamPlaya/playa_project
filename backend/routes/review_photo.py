import base64
import json
import redis
from fastapi import APIRouter, File, UploadFile, Form, HTTPException

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
    if not img.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type.")

    target_beach_lat = beach_lat if beach_lat != 0.0 else lat
    target_beach_lon = beach_lon if beach_lon != 0.0 else lon


    distance = calculate_distance(lat, lon, target_beach_lat, target_beach_lon)
    
    if distance > 150:
        raise HTTPException(
            status_code=400, 
            detail=f"Odrzucono: Jesteś za daleko od wybranej plaży ({int(distance)}m)."
        )

    photo_bytes = await img.read()
    photo_base64 = base64.b64encode(photo_bytes).decode("utf-8")

    payload = {
        "user_lat": lat,
        "user_lon": lon,
        "beach_lat": target_beach_lat,
        "beach_lon": target_beach_lon,
        "photo_base64": photo_base64
    }
    redis_client.lpush("beach_photos_queue", json.dumps(payload))
    
    return {"status": "received", "message": "GPS valid. Photo queued for AI anti-spoofing verification."}