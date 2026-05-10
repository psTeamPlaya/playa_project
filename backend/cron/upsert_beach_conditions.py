from datetime import date, timedelta, datetime
import requests
import logging

from sqlalchemy import create_engine, delete
from sqlalchemy.dialects.postgresql import insert

from backend.db import SessionLocal
from backend.models.beach import Beach
from backend.models.beach_condition import BeachCondition

logging.basicConfig(
    filename="beach_conditions_job.log",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

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

def fetch_weather(lat, lon, start, end):
    return requests.get(
        "https://api.open-meteo.com/v1/forecast",
        params={
            "latitude": lat,
            "longitude": lon,
            "hourly": ",".join([
                MAP["air_temperature"],
                MAP["wind_speed"],
                MAP["cloud_cover"],
                MAP["rain_probability"]
            ]),
            "daily": MAP["uv_index"],
            "timezone": "auto",
            "start_date": start,
            "end_date": end
        },
        timeout=30
    ).json()


def fetch_marine(lat, lon, start, end):
    return requests.get(
        "https://marine-api.open-meteo.com/v1/marine",
        params={
            "latitude": lat,
            "longitude": lon,
            "hourly": ",".join([
                MAP["wave_height"],
                MAP["water_temp"],
                MAP["tide"]
            ]),
            "start_date": start,
            "end_date": end
        },
        timeout=30
    ).json()


def run_job():
    db = SessionLocal()

    try:
        today = date.today()
        end_day = today + timedelta(days=16)

        print("Starting beach conditions update")

        # 1) Borrar datos de días anteriores a hoy
        db.execute(
            delete(BeachCondition).where(
                BeachCondition.datetime < today
            )
        )
        db.commit()

        beaches = db.query(Beach).all()

        total = 0

        for beach in beaches:

            weather = fetch_weather(
                beach.latitude,
                beach.longitude,
                today.isoformat(),
                end_day.isoformat()
            )

            marine = fetch_marine(
                beach.latitude,
                beach.longitude,
                today.isoformat(),
                end_day.isoformat()
            )

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
                    set_= {
                        "air_temp": weather["hourly"]["temperature_2m"][i],
                        "wind_speed": weather["hourly"]["wind_speed_10m"][i],
                        "cloud_cover": weather["hourly"]["cloud_cover"][i],
                        "rain_probability": weather["hourly"]["precipitation_probability"][i],
                        "wave_height": marine["hourly"]["wave_height"][j],
                        "water_temp": marine["hourly"]["sea_surface_temperature"][j],
                        "tide": marine["hourly"]["sea_level_height_msl"][j],
                        "uv_index": uv_index
                    }
                )
                db.execute(stmt)
                total += 1
            db.commit()  # commit por playa
        print(f"Job finished. Records processed: {total}")

    except Exception as e:
        logging.exception(f"Job failed: {e}")

    finally:
        db.close()


# Entrypoint
if __name__ == "__main__":
    run_job()