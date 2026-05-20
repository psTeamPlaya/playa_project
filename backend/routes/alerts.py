from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.alerts_service import build_alert_filters, serialize_user_alert
from backend.auth.auth import get_current_user
from backend.db import get_db
from backend.engine_recomendation import cargar_playas
from backend.models.user import User
from backend.models.user_alert import UserAlert
from backend.routes.admin import collect_available_activities, normalize_activity_name
from backend.schemas.alert import UserAlertCreate, UserAlertResponse


router = APIRouter(prefix="/api/users/me/alerts", tags=["Alerts"])


def _resolve_alert_payload(
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

    resolved_values = {
        "filters": build_alert_filters(payload.filters, beach_id=int(target_beach["id"])),
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


@router.get("", response_model=list[UserAlertResponse])
def list_user_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alerts = (
        db.query(UserAlert)
        .filter(UserAlert.user_id == current_user.id)
        .order_by(UserAlert.created_at.desc(), UserAlert.id.desc())
        .all()
    )
    return [serialize_user_alert(alert) for alert in alerts]


@router.post("", response_model=UserAlertResponse)
def create_user_alert(
    payload: UserAlertCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing_count = db.query(UserAlert).filter(UserAlert.user_id == current_user.id).count()
    if existing_count >= 3:
        raise HTTPException(status_code=400, detail="Solo puedes configurar hasta 3 alertas")

    activity_name, resolved_values = _resolve_alert_payload(payload, db)

    alert = UserAlert(
        user_id=current_user.id,
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


@router.put("/{alert_id}", response_model=UserAlertResponse)
def update_user_alert(
    alert_id: int,
    payload: UserAlertCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alert = (
        db.query(UserAlert)
        .filter(UserAlert.id == alert_id, UserAlert.user_id == current_user.id)
        .first()
    )
    if alert is None:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")

    activity_name, resolved_values = _resolve_alert_payload(payload, db)
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


@router.delete("/{alert_id}")
def delete_user_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alert = (
        db.query(UserAlert)
        .filter(UserAlert.id == alert_id, UserAlert.user_id == current_user.id)
        .first()
    )
    if alert is None:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")

    db.delete(alert)
    db.commit()
    return {"ok": True}
