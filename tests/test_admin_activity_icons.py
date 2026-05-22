import asyncio
import io

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from starlette.datastructures import UploadFile
from PIL import Image

import backend.models  # noqa: F401
import backend.routes.activities as activities_routes
import backend.routes.admin as admin_routes
from backend.db import Base
from backend.models.variable import Variable
from backend.routes.admin import (
    AdminCatalogItemPayload,
    create_admin_activity,
    list_admin_activities,
    update_admin_activity,
)


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


def test_admin_activity_create_and_list_include_icon(monkeypatch):
    db = make_test_session()
    db.add(Variable(name="wave_height", unit="m"))
    db.commit()

    monkeypatch.setattr("backend.routes.admin.load_beach_metadata", lambda: [])
    monkeypatch.setattr("backend.routes.admin.save_beach_metadata", lambda _metadata: None)

    created = create_admin_activity(
        AdminCatalogItemPayload(
            name="Paddle Surf",
            icon="/static/img/paddle-surf.png",
            weights={"wave_height": 1},
        ),
        db=db,
    )
    listed = list_admin_activities(db=db)

    assert created["icon"] == "/static/img/paddle-surf.png"
    assert any(
        item["name"] == "paddle_surf" and item["icon"] == "/static/img/paddle-surf.png"
        for item in listed
    )


def test_admin_activity_update_allows_changing_icon(monkeypatch):
    db = make_test_session()
    db.add(Variable(name="wave_height", unit="m"))
    db.commit()

    monkeypatch.setattr("backend.routes.admin.load_beach_metadata", lambda: [])
    monkeypatch.setattr("backend.routes.admin.save_beach_metadata", lambda _metadata: None)

    created = create_admin_activity(
        AdminCatalogItemPayload(
            name="Paddle Surf",
            icon="/static/img/paddle-surf.png",
            weights={"wave_height": 1},
        ),
        db=db,
    )

    updated = update_admin_activity(
        created["name"],
        AdminCatalogItemPayload(
            name="Paddle Surf",
            icon="https://cdn.ejemplo.com/icons/paddle.png",
            weights={"wave_height": 1},
        ),
        db=db,
    )

    assert updated["icon"] == "https://cdn.ejemplo.com/icons/paddle.png"


def test_public_activities_route_exposes_activity_icon(monkeypatch):
    db = make_test_session()
    db.add(Variable(name="wave_height", unit="m"))
    db.commit()

    monkeypatch.setattr("backend.routes.admin.load_beach_metadata", lambda: [])
    monkeypatch.setattr("backend.routes.admin.save_beach_metadata", lambda _metadata: None)

    create_admin_activity(
        AdminCatalogItemPayload(
            name="Paddle Surf",
            icon="/static/img/paddle-surf.png",
            weights={"wave_height": 1},
        ),
        db=db,
    )

    activities = activities_routes.get_activities(db=db)

    assert any(
        item["name"] == "paddle_surf" and item["icon"] == "/static/img/paddle-surf.png"
        for item in activities
    )


def test_admin_activity_icon_upload_saves_png_in_static_img(tmp_path, monkeypatch):
    monkeypatch.setattr(admin_routes, "ACTIVITY_ICONS_DIR", tmp_path)

    image_buffer = io.BytesIO()
    Image.new("RGBA", (64, 64), (0, 180, 216, 255)).save(image_buffer, format="PNG")
    image_buffer.seek(0)

    upload = UploadFile(filename="icon.png", file=image_buffer)

    result = asyncio.run(
        admin_routes.upload_admin_activity_icon(
            name="Paddle Surf",
            icon_file=upload,
        )
    )

    saved_files = list(tmp_path.glob("activity-paddle_surf.png"))

    assert result["icon"].startswith("/static/img/activity-paddle_surf.png?v=")
    assert len(saved_files) == 1
