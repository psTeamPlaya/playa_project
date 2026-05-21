from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.alerts_service import build_alert_filters, send_user_alert_notification, serialize_user_alert
from backend.catalog_utils import collect_available_activities, normalize_activity_name
from backend.engine_recomendation import cargar_playas
from backend.models.user import User
from backend.models.user_alert import UserAlert
from backend.schemas.alert import UserAlertCreate


def resolve_alert_payload(
    payload: UserAlertCreate,
    db: Session,
) -> tuple[str, dict]:
    activity_name = normalize_activity_name(payload.activity_name)
    available_activities = set(collect_available_activities(db))
    if not activity_name or activity_name not in available_activities:
        raise HTTPException(status_code=400, detail="Debes seleccionar una actividad válida")

    beaches = {int(beach["id"]): beach for beach in cargar_playas()}
    target_beach = beaches.get(int(payload.beach_id))
    if target_beach is None:
        raise HTTPException(status_code=400, detail="Debes seleccionar una playa válida")

    try:
        filters = build_alert_filters(payload.filters, beach_id=int(target_beach["id"]))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    resolved_values = {
        "filters": filters,
        "latitude": float(target_beach["latitud"]),
        "longitude": float(target_beach["longitud"]),
        "radio_km": 1,
        "location_label": (
            f'{target_beach["nombre"]} · {target_beach["ubicacion"]}'
            if target_beach.get("ubicacion")
            else target_beach["nombre"]
        ),
    }
    return activity_name, resolved_values


def list_alerts_for_user(user_id: int, db: Session) -> list[dict]:
    alerts = (
        db.query(UserAlert)
        .filter(UserAlert.user_id == user_id)
        .order_by(UserAlert.created_at.desc(), UserAlert.id.desc())
        .all()
    )
    return [serialize_user_alert(alert) for alert in alerts]


def create_alert_for_user(
    user_id: int,
    payload: UserAlertCreate,
    db: Session,
    *,
    max_alerts: int = 3,
) -> dict:
    existing_count = db.query(UserAlert).filter(UserAlert.user_id == user_id).count()
    if existing_count >= max_alerts:
        raise HTTPException(
            status_code=400,
            detail=f"Solo puedes configurar hasta {max_alerts} alertas",
        )

    activity_name, resolved_values = resolve_alert_payload(payload, db)
    alert = UserAlert(
        user_id=user_id,
        activity_name=activity_name,
        filters=resolved_values["filters"],
        latitude=resolved_values["latitude"],
        longitude=resolved_values["longitude"],
        radio_km=resolved_values["radio_km"],
        location_label=resolved_values["location_label"],
        is_active=True,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return serialize_user_alert(alert)


def update_alert_for_user(
    alert_id: int,
    user_id: int,
    payload: UserAlertCreate,
    db: Session,
) -> dict:
    alert = (
        db.query(UserAlert)
        .filter(UserAlert.id == alert_id, UserAlert.user_id == user_id)
        .first()
    )
    if alert is None:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")

    activity_name, resolved_values = resolve_alert_payload(payload, db)
    alert.activity_name = activity_name
    alert.filters = resolved_values["filters"]
    alert.latitude = resolved_values["latitude"]
    alert.longitude = resolved_values["longitude"]
    alert.radio_km = resolved_values["radio_km"]
    alert.location_label = resolved_values["location_label"]
    alert.last_notified_match = None

    db.commit()
    db.refresh(alert)
    return serialize_user_alert(alert)


def delete_alert_for_user(
    alert_id: int,
    user_id: int,
    db: Session,
) -> dict:
    alert = (
        db.query(UserAlert)
        .filter(UserAlert.id == alert_id, UserAlert.user_id == user_id)
        .first()
    )
    if alert is None:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")

    db.delete(alert)
    db.commit()
    return {"ok": True}


def send_alert_email_for_user(
    alert_id: int,
    user: User,
    db: Session,
) -> dict:
    alert = (
        db.query(UserAlert)
        .filter(UserAlert.id == alert_id, UserAlert.user_id == user.id)
        .first()
    )
    if alert is None:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")

    try:
        match = send_user_alert_notification(db, alert, user, force=True)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    db.commit()
    db.refresh(alert)
    return {
        "ok": True,
        "message": "Email enviado correctamente.",
        "match_datetime": match["datetime"],
        "alert": serialize_user_alert(alert),
    }
