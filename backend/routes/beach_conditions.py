from fastapi import APIRouter, Depends, Query
from datetime import date, timedelta, datetime
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session
import requests

from backend.db import get_db
from backend.models.beach import Beach
from backend.models.beach_condition import BeachCondition
from backend.schemas.beach_condition import BeachConditionResponse


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


def upsert_beach_conditions(db: Session = Depends(get_db)):
    beaches = db.query(Beach).all()
    today = date.today()
    days = [today + timedelta(days=i) for i in range(16)]
    total = 0

    for beach in beaches:
        for day in days:
            try:
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
                if not weather.get("hourly") or not marine.get("hourly"):
                    continue

                w_time = weather["hourly"].get("time", [])
                m_time = marine["hourly"].get("time", [])
                if not w_time or not m_time:
                    continue

                marine_map = {t: i for i, t in enumerate(m_time)}
                uv_index = (
                    weather.get("daily", {})
                    .get("uv_index_max", [None])[0]
                )

                for i, t in enumerate(w_time):
                    if t not in marine_map:
                        continue
                    try:
                        j = marine_map[t]
                        dt = datetime.fromisoformat(t.replace("Z", ""))
                        stmt = insert(BeachCondition).values(
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
                        stmt = stmt.on_conflict_do_update(
                            index_elements=["beach_id", "datetime"],
                            set_={
                                "air_temp": stmt.excluded.air_temp,
                                "wind_speed": stmt.excluded.wind_speed,
                                "cloud_cover": stmt.excluded.cloud_cover,
                                "rain_probability": stmt.excluded.rain_probability,
                                "wave_height": stmt.excluded.wave_height,
                                "water_temp": stmt.excluded.water_temp,
                                "tide": stmt.excluded.tide,
                                "uv_index": stmt.excluded.uv_index,
                            }
                        )
                        db.execute(stmt)
                        total += 1
                    except Exception as e:
                        # evita que un punto roto mate todo el batch
                        print(f"[SKIP DATUM] beach={beach.id} time={t} err={e}")
                        continue
            except Exception as e:
                # evita que una playa entera rompa
                print(f"[SKIP BEACH/DAY] beach={beach.id} day={day} err={e}")
                continue
        db.commit()
    return {
        "status": "ok",
        "records": total,
        "beaches": len(beaches),
        "days": len(days)
    }


@router.post("", response_model=list[BeachConditionResponse])
def read_beach_conditions(
    dt: datetime = Query(..., alias="datetime"),
    db: Session = Depends(get_db)
):
    return db.query(BeachCondition).filter(BeachCondition.datetime == dt).all()
