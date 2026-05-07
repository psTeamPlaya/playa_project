from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import backend.models  # noqa: F401
from backend.db import Base
from backend.models.activity import Activity
from backend.models.service import Service


ADMIN_ROUTE_PATH = Path(__file__).resolve().parents[1] / "backend" / "routes" / "admin.py"
ADMIN_ROUTE_SPEC = spec_from_file_location("admin_route_for_tests", ADMIN_ROUTE_PATH)
ADMIN_ROUTE_MODULE = module_from_spec(ADMIN_ROUTE_SPEC)
assert ADMIN_ROUTE_SPEC.loader is not None
ADMIN_ROUTE_SPEC.loader.exec_module(ADMIN_ROUTE_MODULE)

collect_available_activities = ADMIN_ROUTE_MODULE.collect_available_activities
collect_available_services = ADMIN_ROUTE_MODULE.collect_available_services
create_admin_activity = ADMIN_ROUTE_MODULE.create_admin_activity
create_admin_service = ADMIN_ROUTE_MODULE.create_admin_service
delete_admin_activity = ADMIN_ROUTE_MODULE.delete_admin_activity
delete_admin_service = ADMIN_ROUTE_MODULE.delete_admin_service
ensure_beach_id_sequence = ADMIN_ROUTE_MODULE.ensure_beach_id_sequence
list_admin_activities = ADMIN_ROUTE_MODULE.list_admin_activities
list_admin_services = ADMIN_ROUTE_MODULE.list_admin_services
normalize_service_name = ADMIN_ROUTE_MODULE.normalize_service_name
normalize_activity_name = ADMIN_ROUTE_MODULE.normalize_activity_name
serialize_beach = ADMIN_ROUTE_MODULE.serialize_beach
AdminCatalogItemPayload = ADMIN_ROUTE_MODULE.AdminCatalogItemPayload


def make_test_session():
    engine = create_engine("sqlite:///:memory:", future=True)
    TestingSessionLocal = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
        future=True,
    )
    Base.metadata.create_all(bind=engine)
    return TestingSessionLocal()


class DummyActivity:
    def __init__(self, name: str):
        self.name = name


class DummyQuery:
    def __init__(self, items):
        self.items = items

    def order_by(self, *_args, **_kwargs):
        return self

    def all(self):
        return self.items


class DummyDb:
    def __init__(self, activities):
        self.activities = activities

    def query(self, model):
        return DummyQuery(self.activities)


class DummyBeach:
    def __init__(self):
        self.id = 1
        self.name = "Las Canteras"
        self.location = "Las Palmas de Gran Canaria"
        self.description = "Demo"
        self.type = "arena"
        self.latitude = 28.1416
        self.longitude = -15.4328
        self.accessibility = "alta"
        self.image = "las_canteras.jpg"
        self.services = []


def test_normalize_activity_name_handles_aliases():
    assert normalize_activity_name("Tomar sol") == "tomar_sol"
    assert normalize_activity_name("Pasear") == "caminar"
    assert normalize_activity_name("Piscina Natural") == "piscina_natural"
    assert normalize_activity_name("Kite-Surf") == "kitesurf"


def test_collect_available_activities_unifies_db_and_defaults(monkeypatch):
    metadata = [
        {"actividades_ideales": [{"actividad": "Tomar sol"}, {"actividad": "Pasear"}]},
        {"actividades_ideales": [{"actividad": "Buceo"}]},
    ]
    db = DummyDb([DummyActivity("Surf"), DummyActivity("Kayak")])

    monkeypatch.setattr(ADMIN_ROUTE_MODULE, "load_beach_metadata", lambda: metadata)

    activities = collect_available_activities(db)

    assert "surf" in activities
    assert "kayak" in activities
    assert "tomar_sol" in activities
    assert "caminar" in activities
    assert "bucear" in activities
    assert "piscina_natural" not in activities


def test_collect_available_services_unifies_db_and_metadata(monkeypatch):
    metadata = [
        {"servicios": {"balneario": True, "hamacas": True}},
        {"servicios": {"pet_friendly": False}},
    ]
    db = DummyDb([DummyActivity("restaurantes"), DummyActivity("comida_para_llevar")])

    monkeypatch.setattr(ADMIN_ROUTE_MODULE, "load_beach_metadata", lambda: metadata)

    services = collect_available_services(db)

    assert "restaurantes" in services
    assert "comida_para_llevar" in services
    assert "balnearios" in services
    assert "hamacas" in services
    assert "pet_friendly" in services


def test_serialize_beach_normalizes_metadata_activities():
    beach = DummyBeach()
    metadata = {
        "actividades_ideales": [
            {"actividad": "Tomar sol"},
            {"actividad": "Pasear"},
            {"actividad": "Surf"},
        ],
        "servicios": {},
    }

    serialized = serialize_beach(beach, metadata)

    assert serialized["activities"] == ["tomar_sol", "caminar", "surf"]


def test_serialize_beach_normalizes_legacy_rock_type():
    beach = DummyBeach()
    beach.type = "roca"

    serialized = serialize_beach(beach, {"actividades_ideales": [], "servicios": {}})

    assert serialized["type"] == "piscina_natural"


def test_ensure_beach_id_sequence_executes_setval():
    calls = []

    class DummySequenceDb:
        def execute(self, statement):
            calls.append(str(statement))

    ensure_beach_id_sequence(DummySequenceDb())

    assert calls
    assert "setval" in calls[0].lower()
    assert "pg_get_serial_sequence('beaches', 'id')" in calls[0]


def test_normalize_service_name_handles_aliases():
    assert normalize_service_name("Balneario") == "balnearios"
    assert normalize_service_name("Pet Friendly") == "pet_friendly"
    assert normalize_service_name("Comida para llevar") == "comida_para_llevar"


def test_admin_activity_crud_updates_metadata(monkeypatch):
    db = make_test_session()
    saved_metadata = {}

    monkeypatch.setattr(
        ADMIN_ROUTE_MODULE,
        "load_beach_metadata",
        lambda: [{"id": 1, "actividades_ideales": [{"actividad": "Kayak"}], "servicios": {}}],
    )
    monkeypatch.setattr(
        ADMIN_ROUTE_MODULE,
        "save_beach_metadata",
        lambda metadata: saved_metadata.setdefault("value", metadata),
    )

    created = create_admin_activity(AdminCatalogItemPayload(name="Paddle Surf"), db=db, _=object())
    listed = list_admin_activities(db=db, _=object())

    assert created["name"] == "paddle_surf"
    assert listed[0]["name"] == "paddle_surf"

    delete_admin_activity(created["id"], db=db, _=object())

    assert db.query(Activity).count() == 0
    assert saved_metadata["value"][0]["actividades_ideales"] == [{"actividad": "Kayak"}]


def test_admin_service_crud_updates_metadata(monkeypatch):
    db = make_test_session()
    saved_metadata = {}
    db.add(Service(name="restaurantes"))
    db.commit()

    monkeypatch.setattr(
        ADMIN_ROUTE_MODULE,
        "load_beach_metadata",
        lambda: [{"id": 1, "actividades_ideales": [], "servicios": {"hamacas": True, "balneario": True}}],
    )
    monkeypatch.setattr(
        ADMIN_ROUTE_MODULE,
        "save_beach_metadata",
        lambda metadata: saved_metadata.setdefault("value", metadata),
    )

    created = create_admin_service(AdminCatalogItemPayload(name="Hamacas"), db=db, _=object())
    listed = list_admin_services(db=db, _=object())

    assert created["name"] == "hamacas"
    assert {item["name"] for item in listed} == {"restaurantes", "hamacas"}

    delete_admin_service(created["id"], db=db, _=object())

    assert db.query(Service).filter(Service.name == "hamacas").first() is None
    assert saved_metadata["value"][0]["servicios"] == {"balneario": True}


def test_admin_activity_rejects_duplicates():
    db = make_test_session()
    db.add(Activity(name="surf"))
    db.commit()

    with pytest.raises(HTTPException) as excinfo:
        create_admin_activity(AdminCatalogItemPayload(name="Surf"), db=db, _=object())

    assert excinfo.value.status_code == 400


def test_admin_service_rejects_duplicates():
    db = make_test_session()
    db.add(Service(name="hamacas"))
    db.commit()

    with pytest.raises(HTTPException) as excinfo:
        create_admin_service(AdminCatalogItemPayload(name="Hamacas"), db=db, _=object())

    assert excinfo.value.status_code == 400
