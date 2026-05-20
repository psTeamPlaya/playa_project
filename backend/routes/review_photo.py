import base64
import json
import redis
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from PIL import Image
import io
import time
import hashlib

from backend.engine_recomendation import cargar_playas
from backend.db import redis_session

EXPIRATION_REVIEW_PHOTO = 3*3600

router = APIRouter(prefix="/api/review-photo", tags=["Review-Photo"])

redis_client = redis_session

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
    client_photo_hash: str = Form(...)
):
    
    MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB
    MAX_DIMENSION = 1024
    
    photo_bytes = await img.read()
    
    if len(photo_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large.")

    server_calculated_hash = hashlib.md5(photo_bytes).hexdigest()
    if client_photo_hash != server_calculated_hash:
        raise HTTPException(status_code=400, detail="Integrity check failed. MD5 mismatch.")
    
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
    timestamp = int(time.time())


    redis_client.set(f"photo_storage:{client_photo_hash}", photo_bytes, ex=600)


    payload = {"beach_id": beach_id, "photo_hash": client_photo_hash, "timestamp": timestamp}
    redis_client.lpush("beach_photos_queue", json.dumps(payload))
    
    return {
        "status": "received", 
        "beach_name": closest_beach["nombre"],
        "beach_id": beach_id,
        "photo_hash": client_photo_hash,
        "message": "GPS valid. Photo queued for AI anti-spoofing verification."
    }

@router.get("/get-photos/{beach_id}")
async def get_beach_photos(beach_id: int):
    beach_key = f"beach_photos:{beach_id}"
    
    photos = redis_client.zrevrange(beach_key, 0, -1)
    
    decoded_photos = []
    for p_json in photos:
        try:
            data = json.loads(p_json)
            print(int(data.get("timestamp", 0)))
            decoded_photos.append({
                "photo_hash": data.get("photo_hash"),
                "timestamp": int(data.get("timestamp", 0)),
                "photo": data.get("photo", "")
            })
        except Exception:
            continue
            
    return {"photos": decoded_photos}


@router.get("/count-photos/{beach_id}")
async def count_beach_photos(beach_id: int):
    beach_key = f"beach_photos:{beach_id}"
    
    cuttoff = int(time.time()) - EXPIRATION_REVIEW_PHOTO
    redis_client.zremrangebyscore(beach_key, 0, cuttoff)
    
    count = redis_client.zcard(beach_key)
    
    return {"beach_id": beach_id, "photos_count": count}


@router.post("/delete-my-photo")
async def delete_my_photo(
    beach_id: int = Form(...), 
    photo_hash: str = Form(...)
):
    current_time_int = int(time.time())
    beach_key = f"beach_photos:{beach_id}"
    
    photos = redis_client.zrange(beach_key, 0, -1)
    for p in photos:
        data = json.loads(p)
        if data.get("photo_hash") == photo_hash:
            photo_age = current_time_int - int(data.get("timestamp", 0))
            if photo_age > 180:
                print(current_time_int)
                print(int(data.get("timestamp", 0)))
                raise HTTPException(
                    status_code=403, 
                    detail="El tiempo de gracia de 3 minutos para eliminar esta foto ha expirado."
                )
            redis_client.zrem(beach_key, p)
            redis_client.delete(f"photo_storage:{photo_hash}")
            return {"status": "deleted", "message": "Foto eliminada correctamente de la galería."}

    queue_photos = redis_client.lrange("beach_photos_queue", 0, -1)
    for q_p in queue_photos:
        data = json.loads(q_p)
        if data.get("photo_hash") == photo_hash:
            redis_client.lrem("beach_photos_queue", 0, q_p)
            redis_client.delete(f"photo_storage:{photo_hash}")
            return {"status": "deleted", "message": "Foto eliminada de la cola de espera de la IA."}
            
    raise HTTPException(status_code=404, detail="Foto no encontrada o ya procesada/expirada.")


@router.get("/check-status/{beach_id}/{photo_hash}")
async def check_photo_status(beach_id: int, photo_hash: str):
    beach_key = f"beach_photos:{beach_id}"
    photos = redis_client.zrange(beach_key, 0, -1)
    for p in photos:
        data = json.loads(p)
        if data.get("photo_hash") == photo_hash:
            return {"status": "approved", "message": "Foto aceptada y publicada."}
            
    queue_photos = redis_client.lrange("beach_photos_queue", 0, -1)
    for q_p in queue_photos:
        data = json.loads(q_p)
        if data.get("photo_hash") == photo_hash:
            return {"status": "processing", "message": "Foto aún en verificación por la IA."}
            
    if redis_client.exists(f"photo_rejected:{photo_hash}"):
        return {"status": "rejected", "message": "Foto rechazada por la IA (Spoofing detectado)."}
            
    return {"status": "rejected", "message": "Foto no encontrada o expirada."}