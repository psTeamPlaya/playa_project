from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from backend.catalog_utils import normalize_activity_name, prettify_catalog_name
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
    "dia_semana",
    "dias_semana",
    "hora_inicio",
    "hora_fin",
}
INTERNAL_ALERT_FILTER_KEYS = {"target_beach_id", "last_notification_sent_at_ts"}
SCHEDULE_ALERT_FILTER_KEYS = {"dia_semana", "dias_semana", "hora_inicio", "hora_fin"}
ALERT_NOTIFICATION_INTERVAL = timedelta(days=7)


def _normalize_weekdays_value(value: Any) -> list[int]:
    raw_values = value if isinstance(value, (list, tuple, set)) else [value]
    normalized: list[int] = []
    for item in raw_values:
        if isinstance(item, bool) or not isinstance(item, (int, float)) or int(item) != item:
            continue
        parsed_item = int(item)
        if 0 <= parsed_item <= 6 and parsed_item not in normalized:
            normalized.append(parsed_item)
    return sorted(normalized)


def sanitize_alert_filters(
    filters: dict[str, Any] | None,
    *,
    include_internal: bool = False,
) -> dict[str, Any]:
    if not isinstance(filters, dict):
        return {}

    sanitized: dict[str, Any] = {}

    weekdays = None
    if "dias_semana" in filters:
        weekdays = _normalize_weekdays_value(filters.get("dias_semana"))
    elif "dia_semana" in filters:
        weekdays = _normalize_weekdays_value(filters.get("dia_semana"))
    if weekdays:
        sanitized["dias_semana"] = weekdays

    for key, value in filters.items():
        if value is None:
            continue
        if key in INTERNAL_ALERT_FILTER_KEYS:
            if not include_internal:
                continue
            if key == "target_beach_id" and isinstance(value, (int, float)):
                sanitized[key] = int(value)
            if key == "last_notification_sent_at_ts" and isinstance(value, (int, float)):
                sanitized[key] = float(value)
            continue
        if key not in ALLOWED_ALERT_FILTER_KEYS:
            continue
        if key in SCHEDULE_ALERT_FILTER_KEYS:
            if key in {"dia_semana", "dias_semana"}:
                continue
            if isinstance(value, bool) or not isinstance(value, (int, float)) or int(value) != value:
                continue
            parsed_value = int(value)
            if key in {"hora_inicio", "hora_fin"} and 0 <= parsed_value <= 23:
                sanitized[key] = parsed_value
            continue
        if isinstance(value, bool):
            sanitized[key] = value
            continue
        if isinstance(value, (int, float)):
            sanitized[key] = float(value)
    return sanitized


def validate_alert_filters(filters: dict[str, Any] | None) -> None:
    if not isinstance(filters, dict):
        return

    weekdays_value = filters.get("dias_semana", filters.get("dia_semana"))
    if weekdays_value is not None:
        raw_values = weekdays_value if isinstance(weekdays_value, (list, tuple, set)) else [weekdays_value]
        if not raw_values:
            raise ValueError("Debes seleccionar al menos un d\u00eda de la semana o dejar todos sin marcar.")
        for weekday in raw_values:
            if isinstance(weekday, bool) or not isinstance(weekday, (int, float)) or int(weekday) != weekday:
                raise ValueError("Los d\u00edas de la semana de la alerta no son v\u00e1lidos.")
            if int(weekday) < 0 or int(weekday) > 6:
                raise ValueError("Los d\u00edas de la semana de la alerta no son v\u00e1lidos.")

    start_hour = filters.get("hora_inicio")
    end_hour = filters.get("hora_fin")
    has_start_hour = start_hour is not None
    has_end_hour = end_hour is not None

    if has_start_hour != has_end_hour:
        raise ValueError("Debes indicar la hora de inicio y la hora de fin del rango horario.")

    for label, value in (("hora de inicio", start_hour), ("hora de fin", end_hour)):
        if value is None:
            continue
        if isinstance(value, bool) or not isinstance(value, (int, float)) or int(value) != value:
            raise ValueError(f"La {label} de la alerta no es v\u00e1lida.")
        if int(value) < 0 or int(value) > 23:
            raise ValueError(f"La {label} de la alerta no es v\u00e1lida.")

    if has_start_hour and has_end_hour and int(start_hour) > int(end_hour):
        raise ValueError("La hora de inicio no puede ser mayor que la hora de fin.")


def build_alert_filters(filters: dict[str, Any] | None, *, beach_id: int) -> dict[str, Any]:
    validate_alert_filters(filters)
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


def _matches_schedule_filters(match_datetime: datetime, filters: dict[str, Any]) -> bool:
    weekdays = filters.get("dias_semana")
    if weekdays and match_datetime.weekday() not in {int(weekday) for weekday in weekdays}:
        return False

    start_hour = filters.get("hora_inicio")
    end_hour = filters.get("hora_fin")
    if start_hour is not None and end_hour is not None:
        current_hour = match_datetime.hour
        if current_hour < int(start_hour) or current_hour > int(end_hour):
            return False

    return True


def _get_last_notification_sent_at(alert: UserAlert) -> datetime | None:
    stored_filters = sanitize_alert_filters(alert.filters, include_internal=True)
    timestamp = stored_filters.get("last_notification_sent_at_ts")
    if not isinstance(timestamp, (int, float)):
        return None
    return datetime.fromtimestamp(timestamp)


def _set_last_notification_sent_at(alert: UserAlert, sent_at: datetime) -> None:
    current_filters = dict(alert.filters or {})
    current_filters["last_notification_sent_at_ts"] = sent_at.timestamp()
    alert.filters = current_filters


def _can_send_automatic_alert(alert: UserAlert, sent_at: datetime) -> bool:
    last_sent_at = _get_last_notification_sent_at(alert)
    if last_sent_at is None:
        return True
    return sent_at - last_sent_at >= ALERT_NOTIFICATION_INTERVAL


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
        if not _matches_schedule_filters(condition.datetime, filters):
            continue
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


def send_user_alert_notification(
    db: Session,
    alert: UserAlert,
    user: User,
    *,
    now: datetime | None = None,
    force: bool = False,
) -> dict[str, Any]:
    sent_at = now or datetime.now()

    if user.is_banned:
        raise ValueError("No se puede enviar el email porque el usuario está bloqueado.")
    if not _has_valid_alert_email(user.email):
        raise ValueError("El usuario no tiene un email válido para recibir alertas.")

    match = evaluate_alert_match(db, alert, now=sent_at)
    if match is None:
        raise ValueError("No hay coincidencias actuales para esta alerta.")

    if not force and not _can_send_automatic_alert(alert, sent_at):
        raise ValueError("Ya se envió un email automático para esta alerta durante la última semana.")

    _send_alert_email_sync(
        email=user.email,
        activity_label=prettify_catalog_name(normalize_activity_name(alert.activity_name) or alert.activity_name),
        location_label=alert.location_label,
        beach_name=match["beach_name"],
        match_datetime=match["datetime"],
    )
    alert.last_notified_match = match["datetime"]
    _set_last_notification_sent_at(alert, sent_at)

    return match


async def process_user_alerts_cycle() -> None:
    await _run_in_thread(_process_user_alerts_cycle_sync)


async def _run_in_thread(func, *args, **kwargs):
    return await asyncio.to_thread(func, *args, **kwargs)


def _send_alert_email_sync(**payload) -> None:
    asyncio.run(send_alert_email(**payload))


def _has_valid_alert_email(email: str | None) -> bool:
    return isinstance(email, str) and "@" in email


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
            if not _has_valid_alert_email(user.email):
                continue

            try:
                send_user_alert_notification(db, alert, user, force=False)
            except ValueError as exc:
                if str(exc) == "No hay coincidencias actuales para esta alerta.":
                    alert.last_notified_match = None
                continue

        db.commit()
    finally:
        db.close()
