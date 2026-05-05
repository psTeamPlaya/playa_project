import asyncio

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import backend.models  # noqa: F401
import backend.routes.auth as auth_routes
from backend.db import Base
from backend.models.user import User
from backend.schemas.user import UserCreate


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


def test_register_sends_welcome_email(monkeypatch):
    db = make_test_session()
    sent_emails = []
    scheduled_tasks = []

    async def fake_send_welcome_email(email: str):
        sent_emails.append(email)

    def fake_create_task(coro):
        task = asyncio.get_running_loop().create_task(coro)
        scheduled_tasks.append(task)
        return task

    monkeypatch.setattr(auth_routes, "send_welcome_email", fake_send_welcome_email)
    monkeypatch.setattr(auth_routes.asyncio, "create_task", fake_create_task)

    async def run_test():
        response = await auth_routes.register(
            UserCreate(email="nuevo@ejemplo.com", password="secret123"),
            db=db,
        )
        await asyncio.gather(*scheduled_tasks)
        return response

    response = asyncio.run(run_test())

    created_user = db.query(User).filter(User.email == "nuevo@ejemplo.com").first()

    assert response["msg"] == "registered"
    assert created_user is not None
    assert sent_emails == ["nuevo@ejemplo.com"]


def test_register_existing_user_does_not_send_welcome_email(monkeypatch):
    db = make_test_session()
    existing_user = User(email="repetido@ejemplo.com", hashed_password="hashed")
    db.add(existing_user)
    db.commit()

    email_triggered = False

    async def fake_send_welcome_email(email: str):
        nonlocal email_triggered
        email_triggered = True

    monkeypatch.setattr(auth_routes, "send_welcome_email", fake_send_welcome_email)

    async def run_test():
        with pytest.raises(HTTPException) as excinfo:
            await auth_routes.register(
                UserCreate(email="repetido@ejemplo.com", password="secret123"),
                db=db,
            )
        return excinfo.value

    exc = asyncio.run(run_test())

    assert exc.status_code == 400
    assert email_triggered is False
