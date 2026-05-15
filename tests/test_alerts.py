import asyncio
from datetime import datetime, timedelta
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import backend.models  # noqa: F401
from backend.db import Base
from backend.models.beach_condition import BeachCondition
from backend.models.user import User
from backend.models.user_alert import UserAlert
from backend.routes.admin import normalize_activity_name


ALERTS_ROUTE_PATH = Path(__file__).resolve().parents[1] / "backend" / "routes" / "alerts.py"
ALERTS_ROUTE_SPEC = spec_from_file_location("alerts_route_for_tests", ALERTS_ROUTE_PATH)
ALERTS_ROUTE_MODULE = module_from_spec(ALERTS_ROUTE_SPEC)
assert ALERTS_ROUTE_SPEC.loader is not None
ALERTS_ROUTE_SPEC.loader.exec_module(ALERTS_ROUTE_MODULE)

ALERTS_SERVICE_PATH = Path(__file__).resolve().parents[1] / "backend" / "alerts_service.py"
ALERTS_SERVICE_SPEC = spec_from_file_location("alerts_service_for_tests", ALERTS_SERVICE_PATH)
ALERTS_SERVICE_MODULE = module_from_spec(ALERTS_SERVICE_SPEC)
assert ALERTS_SERVICE_SPEC.loader is not None
ALERTS_SERVICE_SPEC.loader.exec_module(ALERTS_SERVICE_MODULE)

create_user_alert = ALERTS_ROUTE_MODULE.create_user_alert
list_user_alerts = ALERTS_ROUTE_MODULE.list_user_alerts
update_user_alert = ALERTS_ROUTE_MODULE.update_user_alert
delete_user_alert = ALERTS_ROUTE_MODULE.delete_user_alert
UserAlertCreate = ALERTS_ROUTE_MODULE.UserAlertCreate
evaluate_alert_match = ALERTS_SERVICE_MODULE.evaluate_alert_match
process_user_alerts_cycle = ALERTS_SERVICE_MODULE.process_user_alerts_cycle
build_alert_filters = ALERTS_SERVICE_MODULE.build_alert_filters


def make_test_session():
    engine = create_engine("sqlite:///:memory:", future=True)
    testing_session_local = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
        future=True,
    )
    Base.metadata.create_all(bind=engine)
    return testing_session_local()


def create_user(db, email="user@ejemplo.com"):
    user = User(email=email, hashed_password="hashed", is_admin=False, is_banned=False)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_create_user_alert_requires_valid_activity(monkeypatch):
    db = make_test_session()
    user = create_user(db)
    monkeypatch.setattr(ALERTS_ROUTE_MODULE, "collect_available_activities", lambda _db: ["surf"])
    monkeypatch.setattr(
        ALERTS_ROUTE_MODULE,
        "cargar_playas",
        lambda: [{"id": 1, "nombre": "Las Canteras", "ubicacion": "Las Palmas", "latitud": 28.1, "longitud": -15.4}],
    )

    try:
        create_user_alert(
            UserAlertCreate(
                activity_name="kayak",
                beach_id=1,
                filters={},
            ),
            current_user=user,
            db=db,
        )
        assert False, "Expected HTTPException"
    except ALERTS_ROUTE_MODULE.HTTPException as exc:
        assert exc.status_code == 400


def test_create_user_alert_requires_valid_beach(monkeypatch):
    db = make_test_session()
    user = create_user(db)
    monkeypatch.setattr(ALERTS_ROUTE_MODULE, "collect_available_activities", lambda _db: ["surf"])
    monkeypatch.setattr(ALERTS_ROUTE_MODULE, "cargar_playas", lambda: [])

    try:
        create_user_alert(
            UserAlertCreate(
                activity_name="surf",
                beach_id=99,
                filters={},
            ),
            current_user=user,
            db=db,
        )
        assert False, "Expected HTTPException"
    except ALERTS_ROUTE_MODULE.HTTPException as exc:
        assert exc.status_code == 400


def test_create_user_alert_enforces_limit_of_three(monkeypatch):
    db = make_test_session()
    user = create_user(db)
    monkeypatch.setattr(ALERTS_ROUTE_MODULE, "collect_available_activities", lambda _db: ["surf"])
    monkeypatch.setattr(
        ALERTS_ROUTE_MODULE,
        "cargar_playas",
        lambda: [{"id": 1, "nombre": "Las Canteras", "ubicacion": "Las Palmas", "latitud": 28.1, "longitud": -15.4}],
    )

    for index in range(3):
        db.add(
            UserAlert(
                user_id=user.id,
                activity_name="surf",
                filters=build_alert_filters({}, beach_id=1),
                latitude=28.1,
                longitude=-15.4,
                radio_km=1,
                location_label=f"Las Canteras · Las Palmas #{index}",
            )
        )
    db.commit()

    try:
        create_user_alert(
            UserAlertCreate(
                activity_name="surf",
                beach_id=1,
                filters={"min_velocidad_viento": 12},
            ),
            current_user=user,
            db=db,
        )
        assert False, "Expected HTTPException"
    except ALERTS_ROUTE_MODULE.HTTPException as exc:
        assert exc.status_code == 400
        assert "3 alertas" in exc.detail


def test_list_and_delete_user_alerts(monkeypatch):
    db = make_test_session()
    user = create_user(db)
    monkeypatch.setattr(ALERTS_ROUTE_MODULE, "collect_available_activities", lambda _db: ["surf"])
    monkeypatch.setattr(
        ALERTS_ROUTE_MODULE,
        "cargar_playas",
        lambda: [{"id": 1, "nombre": "Las Canteras", "ubicacion": "Las Palmas", "latitud": 28.1, "longitud": -15.4}],
    )

    created = create_user_alert(
        UserAlertCreate(
            activity_name="surf",
            beach_id=1,
            filters={"min_velocidad_viento": 12},
        ),
        current_user=user,
        db=db,
    )

    listed = list_user_alerts(current_user=user, db=db)
    assert len(listed) == 1
    assert listed[0]["activity_name"] == "surf"
    assert listed[0]["beach_id"] == 1
    assert listed[0]["beach_label"] == "Las Canteras · Las Palmas"

    delete_user_alert(created["id"], current_user=user, db=db)
    assert list_user_alerts(current_user=user, db=db) == []


def test_update_user_alert_replaces_activity_beach_and_filters(monkeypatch):
    db = make_test_session()
    user = create_user(db)
    monkeypatch.setattr(ALERTS_ROUTE_MODULE, "collect_available_activities", lambda _db: ["surf", "nadar"])
    monkeypatch.setattr(
        ALERTS_ROUTE_MODULE,
        "cargar_playas",
        lambda: [
            {"id": 1, "nombre": "Las Canteras", "ubicacion": "Las Palmas", "latitud": 28.1, "longitud": -15.4},
            {"id": 2, "nombre": "Maspalomas", "ubicacion": "San Bartolomé", "latitud": 27.74, "longitud": -15.58},
        ],
    )

    created = create_user_alert(
        UserAlertCreate(
            activity_name="surf",
            beach_id=1,
            filters={"min_velocidad_viento": 12},
        ),
        current_user=user,
        db=db,
    )

    updated = update_user_alert(
        created["id"],
        UserAlertCreate(
            activity_name="nadar",
            beach_id=2,
            filters={"max_nubosidad": 20},
        ),
        current_user=user,
        db=db,
    )

    assert updated["activity_name"] == "nadar"
    assert updated["beach_id"] == 2
    assert updated["beach_label"] == "Maspalomas · San Bartolomé"
    assert updated["filters"] == {"max_nubosidad": 20.0}


def test_evaluate_alert_match_returns_first_future_match_for_selected_beach(monkeypatch):
    db = make_test_session()
    user = create_user(db)
    now = datetime(2026, 5, 14, 9, 15)
    match_dt = datetime(2026, 5, 14, 11, 0)
    later_dt = datetime(2026, 5, 14, 12, 0)

    alert = UserAlert(
        user_id=user.id,
        activity_name="surf",
        filters=build_alert_filters({"min_velocidad_viento": 10}, beach_id=1),
        latitude=28.1,
        longitude=-15.4,
        radio_km=1,
        location_label="Las Canteras · Las Palmas",
    )
    db.add(alert)
    db.add_all([
        BeachCondition(
            beach_id=1,
            datetime=match_dt,
            air_temp=24,
            wind_speed=14,
            wave_height=1.5,
            water_temp=22,
            cloud_cover=10,
            rain_probability=0,
            tide=0.0,
            uv_index=6,
        ),
        BeachCondition(
            beach_id=2,
            datetime=match_dt,
            air_temp=24,
            wind_speed=20,
            wave_height=2.0,
            water_temp=22,
            cloud_cover=10,
            rain_probability=0,
            tide=0.0,
            uv_index=6,
        ),
        BeachCondition(
            beach_id=1,
            datetime=later_dt,
            air_temp=25,
            wind_speed=16,
            wave_height=1.8,
            water_temp=22,
            cloud_cover=8,
            rain_probability=0,
            tide=0.0,
            uv_index=6,
        ),
    ])
    db.commit()

    monkeypatch.setattr(
        ALERTS_SERVICE_MODULE,
        "cargar_playas",
        lambda: [
            {
                "id": 1,
                "nombre": "Las Canteras",
                "latitud": 28.12,
                "longitud": -15.43,
                "tipo": "arena",
                "servicios": {},
                "actividades_ideales": [normalize_activity_name("surf")],
            },
            {
                "id": 2,
                "nombre": "El Confital",
                "latitud": 28.15,
                "longitud": -15.45,
                "tipo": "arena",
                "servicios": {},
                "actividades_ideales": [normalize_activity_name("surf")],
            },
        ],
    )

    match = evaluate_alert_match(db, alert, now=now)

    assert match is not None
    assert match["datetime"] == match_dt
    assert match["beach_name"] == "Las Canteras"


def test_process_user_alerts_cycle_sends_email_once_for_same_match(monkeypatch):
    db = make_test_session()
    user = create_user(db)
    user_email = user.email
    match_dt = datetime.utcnow().replace(minute=0, second=0, microsecond=0) + timedelta(hours=2)

    alert = UserAlert(
        user_id=user.id,
        activity_name="surf",
        filters=build_alert_filters({"min_velocidad_viento": 10}, beach_id=1),
        latitude=28.1,
        longitude=-15.4,
        radio_km=1,
        location_label="Las Canteras · Las Palmas",
        is_active=True,
    )
    db.add(alert)
    db.add(
        BeachCondition(
            beach_id=1,
            datetime=match_dt,
            air_temp=24,
            wind_speed=14,
            wave_height=1.5,
            water_temp=22,
            cloud_cover=10,
            rain_probability=0,
            tide=0.0,
            uv_index=6,
        )
    )
    db.commit()
    alert_id = alert.id

    sent_emails = []

    def fake_send_alert_email_sync(**payload):
        sent_emails.append(payload)

    async def run_inline(func, *args, **kwargs):
        return func(*args, **kwargs)

    monkeypatch.setattr(ALERTS_SERVICE_MODULE, "SessionLocal", lambda: db)
    monkeypatch.setattr(ALERTS_SERVICE_MODULE, "_run_in_thread", run_inline)
    monkeypatch.setattr(ALERTS_SERVICE_MODULE, "upsert_beach_conditions", lambda _db: None)
    monkeypatch.setattr(ALERTS_SERVICE_MODULE, "_send_alert_email_sync", fake_send_alert_email_sync)
    monkeypatch.setattr(
        ALERTS_SERVICE_MODULE,
        "cargar_playas",
        lambda: [
            {
                "id": 1,
                "nombre": "Las Canteras",
                "latitud": 28.12,
                "longitud": -15.43,
                "tipo": "arena",
                "servicios": {},
                "actividades_ideales": [normalize_activity_name("surf")],
            }
        ],
    )

    asyncio.run(process_user_alerts_cycle())
    asyncio.run(process_user_alerts_cycle())

    persisted_alert = db.query(UserAlert).filter(UserAlert.id == alert_id).one()
    assert len(sent_emails) == 1
    assert sent_emails[0]["email"] == user_email
    assert persisted_alert.last_notified_match == match_dt
