from fastapi import APIRouter, Depends, Query, HTTPException
from datetime import date, timedelta, datetime
from sqlalchemy.orm import Session
import requests

from backend.db import get_db
from backend.models.beach import Beach
from backend.models.beach_condition import BeachCondition

router = APIRouter(prefix="/beach-conditions", tags=["Beach Conditions"])

MAP = {
    "air_temperature": "temperature_2m",
    "wind_speed": "wind_speed_10m",
    "cloud_cover": "cloud_cover",
    "rain_probability": "precipitation_probability",
    "uv_index": "uv_index_max",
    "wave_height": "wave_height",
    "water_temp": "sea_surface_temperature",
    "tide": "sea_level_height_msl",
}

def fetch_weather(latitude, longitude, day):
    return requests.get(
        "https://api.open-meteo.com/v1/forecast",
        params={
            "latitude": latitude,
            "longitude": longitude,
            "hourly": ",".join([
                MAP["air_temperature"],
                MAP["wind_speed"],
                MAP["cloud_cover"],
                MAP["rain_probability"]
            ]),
            "daily": MAP["uv_index"],
            "timezone": "auto",
            "start_date": day,
            "end_date": day
        }
    ).json()


def fetch_marine(latitude, longitude, day):
    return requests.get(
        "https://marine-api.open-meteo.com/v1/marine",
        params={
            "latitude": latitude,
            "longitude": longitude,
            "hourly": ",".join([
                MAP["wave_height"],
                MAP["water_temp"],
                MAP["tide"]
            ]),
            "start_date": day,
            "end_date": day
        }
    ).json()

@router.post("/full-seed")
def seed_all(db: Session = Depends(get_db)):
    beaches = db.query(Beach).all()

    today = date.today()
    days = [today + timedelta(days=i) for i in range(17)]

    total_saved = 0

    for beach in beaches:
        for day in days:
            weather = fetch_weather(
                beach.latitude,
                beach.longitude,
                day.isoformat()
            )
            marine = fetch_marine(
                beach.latitude,
                beach.longitude,
                day.isoformat()
            )
            # Protección contra APIs vacías
            if "hourly" not in weather or "hourly" not in marine:
                continue

            weather_hours = weather["hourly"]["time"]
            marine_hours = marine["hourly"]["time"]
            marine_index = {t: i for i, t in enumerate(marine_hours)}
            uv_index = weather.get("daily", {}).get("uv_index_max", [None])[0]

            for i, t in enumerate(weather_hours):
                if t not in marine_index:
                    continue
                j = marine_index[t]
                dt = datetime.fromisoformat(t)

                exists = db.query(BeachCondition).filter_by(
                    beach_id=beach.id,
                    datetime=dt
                ).first()
                if exists:
                    continue

                record = BeachCondition(
                    beach_id=beach.id,
                    datetime=dt,

                    air_temp=weather["hourly"]["temperature_2m"][i],
                    wind_speed=weather["hourly"]["wind_speed_10m"][i],
                    cloud_cover=weather["hourly"]["cloud_cover"][i],
                    rain_probability=weather["hourly"]["precipitation_probability"][i],

                    wave_height=marine["hourly"]["wave_height"][j],
                    water_temp=marine["hourly"]["sea_surface_temperature"][j],
                    tide=marine["hourly"]["sea_level_height_msl"][j],

                    uv_index=uv_index
                )
                db.add(record)
                total_saved += 1
        # Commit por playa 
        db.commit()
    return {
        "status": "ok",
        "saved": total_saved,
        "beaches": len(beaches),
        "days": len(days),
        "note": "1 record per beach per hour per day (17 days)"
    }


"""
Formato de parámetros a enviar desde el frontend:
1) beach_id
   - obtenerlo desde el endpoint /beaches
   - guardado en el frontend cuando el usuario selecciona la playa

2) datetime
   - formateado exactamente como: '2026-05-02 03:00:00' ó '2026-05-02T03:00:00' (sin comillas) 
"""
@router.get("")
def read_beach_condition(
    beach_id: int,
    dt: datetime = Query(..., alias="datetime"),
    db: Session = Depends(get_db)
):
    record = (
        db.query(BeachCondition)
        .filter(
            BeachCondition.beach_id == beach_id,
            BeachCondition.datetime == dt
        )
        .first()
    )
    if not record:
        raise HTTPException(
            status_code=404,
            detail="No data found for this beach at that datetime"
        )
    return record