from datetime import datetime

from backend.sunlight_provider import obtener_aviso_luz_solar


def test_avisa_si_tomar_sol_es_antes_del_amanecer(monkeypatch):
    def fake_fetch(*args, **kwargs):
        return (
            datetime.fromisoformat("2026-04-22T07:11"),
            datetime.fromisoformat("2026-04-22T20:18"),
        )

    monkeypatch.setattr("backend.sunlight_provider._fetch_sunrise_sunset", fake_fetch)

    aviso = obtener_aviso_luz_solar(
        actividad="tomar_sol",
        playas=[{"latitud": 28.1, "longitud": -15.4}],
        fecha="2026-04-22",
        hora="06:00",
        timezone="Atlantic/Canary",
        timeout_seconds=10,
    )

    assert aviso == {
        "tipo": "antes_amanecer",
        "mensaje": "A esa hora todavía no ha salido el sol. El sol saldrá a las 07:11 horas",
    }


def test_avisa_si_tomar_sol_es_despues_del_atardecer(monkeypatch):
    def fake_fetch(*args, **kwargs):
        return (
            datetime.fromisoformat("2026-04-22T07:11"),
            datetime.fromisoformat("2026-04-22T20:18"),
        )

    monkeypatch.setattr("backend.sunlight_provider._fetch_sunrise_sunset", fake_fetch)

    aviso = obtener_aviso_luz_solar(
        actividad="tomar_sol",
        playas=[{"latitud": 28.1, "longitud": -15.4}],
        fecha="2026-04-22",
        hora="21:00",
        timezone="Atlantic/Canary",
        timeout_seconds=10,
    )

    assert aviso == {
        "tipo": "despues_atardecer",
        "mensaje": "El sol se pondrá a las 20:18 horas",
    }


def test_no_avisa_si_hay_luz_solar(monkeypatch):
    def fake_fetch(*args, **kwargs):
        return (
            datetime.fromisoformat("2026-04-22T07:11"),
            datetime.fromisoformat("2026-04-22T20:18"),
        )

    monkeypatch.setattr("backend.sunlight_provider._fetch_sunrise_sunset", fake_fetch)

    aviso = obtener_aviso_luz_solar(
        actividad="tomar_sol",
        playas=[{"latitud": 28.1, "longitud": -15.4}],
        fecha="2026-04-22",
        hora="12:00",
        timezone="Atlantic/Canary",
        timeout_seconds=10,
    )

    assert aviso is None
