from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from backend.db import SessionLocal
from backend.engine_recomendation import (
    calcular_score_final,
    cargar_playas,
    distancia_km,
    filtrar,
)
from backend.models.beach_condition import BeachCondition
from backend.models.user import User
from backend.models.user_alert import UserAlert
from backend.notifications import send_alert_email
from backend.routes.admin import normalize_activity_name, prettify_catalog_name
from backend.routes.beach_conditions import upsert_beach_conditions


ALLOWED_ALERT_FILTER_KEYS = {
    "tipo_arena",
    "tipo_piedra",
    "tipo_piscina_natural",
    "restaurantes",
    "comida_para_llevar",
    "balnearios",
    "zona_deportiva",
    "pet_friendly",
    "min_temperatura_ambiente",
    "max_temperatura_ambiente",
    "min_nubosidad",
    "max_nubosidad",
    "min_velocidad_viento",
    "max_velocidad_viento",
    "min_altura_oleaje",
    "max_altura_oleaje",
}
INTERNAL_ALERT_FILTER_KEYS = {"target_beach_id"}


def sanitize_alert_filters(
    filters: dict[str, Any] | None,
    *,
    include_internal: bool = False,
) -> dict[str, Any]:
    if not isinstance(filters, dict):
        return {}

    sanitized: dict[str, Any] = {}
    for key, value in filters.items():
        if value is None:
            continue
        if key in INTERNAL_ALERT_FILTER_KEYS:
            if include_internal and isinstance(value, (int, float)):
                sanitized[key] = int(value)
            continue
        if key not in ALLOWED_ALERT_FILTER_KEYS:
            continue
        if isinstance(value, bool):
            sanitized[key] = value
            continue
        if isinstance(value, (int, float)):
            sanitized[key] = float(value)
    return sanitized


def build_alert_filters(filters: dict[str, Any] | None, *, beach_id: int) -> dict[str, Any]:
    sanitized = sanitize_alert_filters(filters)
    sanitized["target_beach_id"] = int(beach_id)
    return sanitized


def serialize_user_alert(alert: UserAlert) -> dict[str, Any]:
    activity_name = normalize_activity_name(alert.activity_name) or alert.activity_name
    stored_filters = sanitize_alert_filters(alert.filters, include_internal=True)
    beach_id = stored_filters.get("target_beach_id")
    return {
        "id": alert.id,
        "activity_name": activity_name,
        "activity_label": prettify_catalog_name(activity_name),
        "beach_id": int(beach_id) if beach_id is not None else None,
        "beach_label": alert.location_label,
        "filters": sanitize_alert_filters(alert.filters),
        "is_active": bool(alert.is_active),
        "last_notified_match": alert.last_notified_match,
        "created_at": alert.created_at,
        "updated_at": alert.updated_at,
    }


def _round_up_to_next_hour(reference: datetime | None = None) -> datetime:
    reference = reference or datetime.now()
    rounded = reference.replace(minute=0, second=0, microsecond=0)
    if rounded < reference:
        rounded += timedelta(hours=1)
    return rounded


def _condition_to_dict(condition: BeachCondition) -> dict[str, Any]:
    return {
        "air_temp": condition.air_temp,
        "wind_speed": condition.wind_speed,
        "wave_height": condition.wave_height,
        "water_temp": condition.water_temp,
        "cloud_cover": condition.cloud_cover,
        "rain_probability": condition.rain_probability,
        "tide": condition.tide,
        "uv_index": condition.uv_index,
    }


def evaluate_alert_match(
    db: Session,
    alert: UserAlert,
    *,
    now: datetime | None = None,
    horizon_days: int = 14,
) -> dict[str, Any] | None:
    activity_name = normalize_activity_name(alert.activity_name)
    if not activity_name:
        return None

    stored_filters = sanitize_alert_filters(alert.filters, include_internal=True)
    target_beach_id = stored_filters.get("target_beach_id")
    all_beaches = cargar_playas()

    if target_beach_id is not None:
        beaches = [beach for beach in all_beaches if int(beach["id"]) == int(target_beach_id)]
    else:
        beaches = [
            beach
            for beach in all_beaches
            if distancia_km(
                float(alert.latitude),
                float(alert.longitude),
                float(beach["latitud"]),
                float(beach["longitud"]),
            ) <= float(alert.radio_km)
        ]
    if not beaches:
        return None

    beach_ids = [beach["id"] for beach in beaches]
    beach_map = {beach["id"]: beach for beach in beaches}
    filters = sanitize_alert_filters(alert.filters)
    start_at = _round_up_to_next_hour(now)
    end_at = start_at + timedelta(days=horizon_days)

    conditions = (
        db.query(BeachCondition)
        .filter(BeachCondition.beach_id.in_(beach_ids))
        .filter(BeachCondition.datetime >= start_at)
        .filter(BeachCondition.datetime <= end_at)
        .order_by(BeachCondition.datetime.asc(), BeachCondition.beach_id.asc())
        .all()
    )

    current_match: dict[str, Any] | None = None
    current_dt: datetime | None = None

    for condition in conditions:
        if current_dt is not None and condition.datetime != current_dt and current_match is not None:
            return current_match

        current_dt = condition.datetime
        beach = beach_map.get(condition.beach_id)
        if beach is None:
            continue

        condition_dict = _condition_to_dict(condition)
        if not filtrar(beach, condition_dict, filters):
            continue

        activity_is_ideal = activity_name in set(beach.get("actividades_ideales", []))
        score = calcular_score_final(condition_dict, activity_name, activity_is_ideal)
        candidate = {
            "datetime": condition.datetime,
            "beach_id": beach["id"],
            "beach_name": beach["nombre"],
            "score": round(score, 2),
        }

        if current_match is None or candidate["score"] > current_match["score"]:
            current_match = candidate

    return current_match


async def process_user_alerts_cycle() -> None:
    await _run_in_thread(_process_user_alerts_cycle_sync)


async def _run_in_thread(func, *args, **kwargs):
    return await asyncio.to_thread(func, *args, **kwargs)


def _send_alert_email_sync(**payload) -> None:
    asyncio.run(send_alert_email(**payload))


def _process_user_alerts_cycle_sync() -> None:
    db = SessionLocal()
    try:
        try:
            upsert_beach_conditions(db)
        except Exception as exc:  # pragma: no cover - remote provider failures
            print(f" Error actualizando condiciones para alertas: {exc}")

        alerts = db.query(UserAlert).filter(UserAlert.is_active.is_(True)).all()
        for alert in alerts:
            user = db.get(User, alert.user_id)
            if user is None or user.is_banned:
                continue

            match = evaluate_alert_match(db, alert)
            if match is None:
                alert.last_notified_match = None
                continue

            if alert.last_notified_match == match["datetime"]:
                continue

            _send_alert_email_sync(
                email=user.email,
                activity_label=prettify_catalog_name(normalize_activity_name(alert.activity_name) or alert.activity_name),
                location_label=alert.location_label,
                beach_name=match["beach_name"],
                match_datetime=match["datetime"],
            )
            alert.last_notified_match = match["datetime"]

        db.commit()
    finally:
        db.close()
