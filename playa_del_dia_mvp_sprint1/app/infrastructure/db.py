from __future__ import annotations

import sqlite3
from pathlib import Path

from app.config import SQL_SCHEMA_PATH
from app.domain.models import Activity, Beach
from app.infrastructure.seed_data import ACTIVITIES, BEACH_ACTIVITY_COMPATIBILITY, BEACHES


class SQLiteDatabase:
    def __init__(self, db_path: str) -> None:
        self.db_path = db_path

    def connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def initialize(self) -> None:
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as connection:
            connection.executescript(SQL_SCHEMA_PATH.read_text(encoding="utf-8"))
            self._seed_if_empty(connection)
            connection.commit()

    def _seed_if_empty(self, connection: sqlite3.Connection) -> None:
        activity_count = connection.execute("SELECT COUNT(*) FROM activities").fetchone()[0]
        if activity_count == 0:
            connection.executemany(
                "INSERT INTO activities(code, label, icon_path) VALUES (?, ?, ?)",
                ACTIVITIES,
            )

        beach_count = connection.execute("SELECT COUNT(*) FROM beaches").fetchone()[0]
        if beach_count == 0:
            for beach in BEACHES:
                connection.execute(
                    """
                    INSERT INTO beaches(
                        name, municipality, latitude, longitude, surface_type,
                        family_friendly, pet_friendly, food_nearby,
                        has_surf_school, has_windsurf_school, has_sports_area,
                        access_type, default_air_temp_c, default_water_temp_c,
                        default_wave_height_m, default_wind_kmh,
                        default_cloud_cover_pct, default_rain_probability_pct,
                        default_uv_index
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        beach["name"],
                        beach["municipality"],
                        beach["latitude"],
                        beach["longitude"],
                        beach["surface_type"],
                        beach["family_friendly"],
                        beach["pet_friendly"],
                        beach["food_nearby"],
                        beach["has_surf_school"],
                        beach["has_windsurf_school"],
                        beach["has_sports_area"],
                        beach["access_type"],
                        beach["default_air_temp_c"],
                        beach["default_water_temp_c"],
                        beach["default_wave_height_m"],
                        beach["default_wind_kmh"],
                        beach["default_cloud_cover_pct"],
                        beach["default_rain_probability_pct"],
                        beach["default_uv_index"],
                    ),
                )

        compatibility_count = connection.execute(
            "SELECT COUNT(*) FROM beach_activities"
        ).fetchone()[0]
        if compatibility_count == 0:
            beach_ids = {
                row["name"]: row["id"]
                for row in connection.execute("SELECT id, name FROM beaches").fetchall()
            }
            connection.executemany(
                "INSERT INTO beach_activities(beach_id, activity_code, compatibility) VALUES (?, ?, ?)",
                [
                    (beach_ids[beach_name], activity_code, compatibility)
                    for beach_name, activity_code, compatibility in BEACH_ACTIVITY_COMPATIBILITY
                ],
            )


class BeachRepository:
    def __init__(self, database: SQLiteDatabase) -> None:
        self.database = database

    def list_activities(self) -> list[Activity]:
        with self.database.connect() as connection:
            rows = connection.execute(
                "SELECT code, label, icon_path FROM activities ORDER BY label"
            ).fetchall()
        return [Activity(code=row["code"], label=row["label"], icon_path=row["icon_path"]) for row in rows]

    def list_beaches(self) -> list[Beach]:
        with self.database.connect() as connection:
            beach_rows = connection.execute("SELECT * FROM beaches ORDER BY name").fetchall()
            compatibility_rows = connection.execute(
                "SELECT beach_id, activity_code, compatibility FROM beach_activities"
            ).fetchall()

        compat_by_beach: dict[int, dict[str, float]] = {}
        for row in compatibility_rows:
            compat_by_beach.setdefault(row["beach_id"], {})[row["activity_code"]] = float(row["compatibility"])

        beaches: list[Beach] = []
        for row in beach_rows:
            beaches.append(
                Beach(
                    id=int(row["id"]),
                    name=row["name"],
                    municipality=row["municipality"],
                    latitude=float(row["latitude"]),
                    longitude=float(row["longitude"]),
                    surface_type=row["surface_type"],
                    family_friendly=bool(row["family_friendly"]),
                    pet_friendly=bool(row["pet_friendly"]),
                    food_nearby=bool(row["food_nearby"]),
                    has_surf_school=bool(row["has_surf_school"]),
                    has_windsurf_school=bool(row["has_windsurf_school"]),
                    has_sports_area=bool(row["has_sports_area"]),
                    access_type=row["access_type"],
                    default_air_temp_c=float(row["default_air_temp_c"]),
                    default_water_temp_c=float(row["default_water_temp_c"]),
                    default_wave_height_m=float(row["default_wave_height_m"]),
                    default_wind_kmh=float(row["default_wind_kmh"]),
                    default_cloud_cover_pct=float(row["default_cloud_cover_pct"]),
                    default_rain_probability_pct=float(row["default_rain_probability_pct"]),
                    default_uv_index=float(row["default_uv_index"]),
                    activity_compatibility=compat_by_beach.get(int(row["id"]), {}),
                )
            )
        return beaches
