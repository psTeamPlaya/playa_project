from __future__ import annotations

import json
from pathlib import Path
import sys

from sqlalchemy import text

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.db import SessionLocal, engine
from backend.models.beach import Beach

BASE_DIR = Path(__file__).resolve().parent
PLAYAS_FILE = BASE_DIR / "playas.json"


def cargar_playas() -> list[dict]:
    with PLAYAS_FILE.open("r", encoding="utf-8") as f:
        return json.load(f)


def asegurar_esquema_beaches() -> None:
    with engine.begin() as conn:
        column_type = conn.execute(
            text(
                """
                SELECT data_type
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = 'beaches'
                  AND column_name = 'accessibility'
                """
            )
        ).scalar_one_or_none()

        if column_type != "boolean":
            return

        conn.execute(
            text(
                """
                ALTER TABLE beaches
                ALTER COLUMN accessibility TYPE VARCHAR
                USING CASE
                    WHEN accessibility IS NULL THEN NULL
                    WHEN accessibility = TRUE THEN 'alta'
                    ELSE 'baja'
                END
                """
            )
        )


def upsert_beaches(playas: list[dict]) -> tuple[int, int]:
    session = SessionLocal()
    creadas = 0
    actualizadas = 0

    try:
        for playa in playas:
            beach = session.get(Beach, playa["id"])

            if beach is None:
                beach = Beach(id=playa["id"])
                session.add(beach)
                creadas += 1
            else:
                actualizadas += 1

            beach.name = playa["nombre"]
            beach.location = playa.get("ubicacion")
            beach.description = playa.get("descripcion")
            beach.type = playa.get("tipo")
            beach.latitude = playa["latitud"]
            beach.longitude = playa["longitud"]
            beach.accessibility = playa.get("accesibilidad")
            beach.image = playa.get("imagen")

        session.commit()
        return creadas, actualizadas
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def main() -> None:
    playas = cargar_playas()
    asegurar_esquema_beaches()
    creadas, actualizadas = upsert_beaches(playas)
    print(f"Playas procesadas: {len(playas)}")
    print(f"Playas creadas: {creadas}")
    print(f"Playas actualizadas: {actualizadas}")


if __name__ == "__main__":
    main()
