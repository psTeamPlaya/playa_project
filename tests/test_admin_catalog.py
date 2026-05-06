from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path


ADMIN_ROUTE_PATH = Path(__file__).resolve().parents[1] / "backend" / "routes" / "admin.py"
ADMIN_ROUTE_SPEC = spec_from_file_location("admin_route_for_tests", ADMIN_ROUTE_PATH)
ADMIN_ROUTE_MODULE = module_from_spec(ADMIN_ROUTE_SPEC)
assert ADMIN_ROUTE_SPEC.loader is not None
ADMIN_ROUTE_SPEC.loader.exec_module(ADMIN_ROUTE_MODULE)

collect_available_activities = ADMIN_ROUTE_MODULE.collect_available_activities
normalize_activity_name = ADMIN_ROUTE_MODULE.normalize_activity_name
serialize_beach = ADMIN_ROUTE_MODULE.serialize_beach


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
    assert "piscina_natural" in activities


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
