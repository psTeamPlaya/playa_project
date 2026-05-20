from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.auth.auth import get_current_user
from backend.db import get_db
from backend.models.user import User
from backend.schemas.alert import UserAlertCreate, UserAlertResponse
from backend.user_alerts import (
    create_alert_for_user,
    delete_alert_for_user,
    list_alerts_for_user,
    update_alert_for_user,
)


router = APIRouter(prefix="/api/users/me/alerts", tags=["Alerts"])


@router.get("", response_model=list[UserAlertResponse])
def list_user_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_alerts_for_user(current_user.id, db)


@router.post("", response_model=UserAlertResponse)
def create_user_alert(
    payload: UserAlertCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_alert_for_user(current_user.id, payload, db)


@router.put("/{alert_id}", response_model=UserAlertResponse)
def update_user_alert(
    alert_id: int,
    payload: UserAlertCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_alert_for_user(alert_id, current_user.id, payload, db)


@router.delete("/{alert_id}")
def delete_user_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return delete_alert_for_user(alert_id, current_user.id, db)
