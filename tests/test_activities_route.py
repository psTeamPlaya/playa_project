from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path


ACTIVITIES_ROUTE_PATH = Path(__file__).resolve().parents[1] / "backend" / "routes" / "activities.py"
ACTIVITIES_ROUTE_SPEC = spec_from_file_location("activities_route_for_tests", ACTIVITIES_ROUTE_PATH)
ACTIVITIES_ROUTE_MODULE = module_from_spec(ACTIVITIES_ROUTE_SPEC)
assert ACTIVITIES_ROUTE_SPEC.loader is not None
ACTIVITIES_ROUTE_SPEC.loader.exec_module(ACTIVITIES_ROUTE_MODULE)

get_activities = ACTIVITIES_ROUTE_MODULE.get_activities


def test_get_activities_returns_public_catalog(monkeypatch):
    monkeypatch.setattr(
        ACTIVITIES_ROUTE_MODULE,
        "collect_available_activities",
        lambda _db: ["surf", "paddle_surf"],
    )

    activities = get_activities(db=object())

    assert activities == [
        {"name": "surf", "label": "Surf"},
        {"name": "paddle_surf", "label": "Paddle surf"},
    ]
