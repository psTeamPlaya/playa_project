import builtins

from backend import engine_recomendation, weather_provider


def test_print_openmeteo_terminal_snapshot_emite_una_linea_por_playa(monkeypatch):
    printed_lines = []

    monkeypatch.setattr(builtins, "print", lambda message: printed_lines.append(message))

    weather_provider._print_openmeteo_terminal_snapshot(
        fecha="2026-05-16",
        hora="12:00",
        timezone="Atlantic/Canary",
        condiciones=[
            {
                "beach_id": 1,
                "nombre_playa": "Las Canteras",
                "fecha": "2026-05-16",
                "hora": "12:00",
                "temperatura_ambiente": 24.5,
                "velocidad_viento": 12.0,
            },
            {
                "beach_id": 2,
                "nombre_playa": "Maspalomas",
                "fecha": "2026-05-16",
                "hora": "12:00",
                "temperatura_ambiente": 26.0,
                "velocidad_viento": 9.0,
            },
        ],
    )

    assert printed_lines[0] == (
        "[Open-Meteo] Datos remotos para recomendaciones "
        "2026-05-16 12:00 (Atlantic/Canary) - 2 playas"
    )
    assert '"nombre_playa": "Las Canteras"' in printed_lines[1]
    assert '"nombre_playa": "Maspalomas"' in printed_lines[2]


def test_cargar_condiciones_open_meteo_devuelve_datos_normalizados(monkeypatch):
    monkeypatch.setattr(
        engine_recomendation,
        "obtener_condiciones_open_meteo",
        lambda **kwargs: [
            {
                "beach_id": 99,
                "nombre_playa": "Punta de Galdar",
                "fecha": "2026-05-16",
                "hora": "12:00",
                "temperatura_ambiente": 24.0,
                "velocidad_viento": 8.0,
                "altura_oleaje": 0.4,
                "temperatura_agua": 21.0,
                "nubosidad": 10,
                "probabilidad_lluvia": 0,
                "marea": "media",
                "fuente": "Open-Meteo Forecast API + Marine Weather API",
            }
        ],
    )

    condiciones = engine_recomendation.cargar_condiciones_open_meteo(
        [{"id": 99, "nombre": "Punta de Galdar", "latitud": 28.169189, "longitud": -15.682056}],
        "2026-05-16",
        "12:00",
    )

    assert condiciones == [
        {
            "beach_id": 99,
            "nombre_playa": "Punta de Galdar",
            "fecha": "2026-05-16",
            "hora": "12:00",
            "air_temp": 24.0,
            "wind_speed": 8.0,
            "wave_height": 0.4,
            "water_temp": 21.0,
            "cloud_cover": 10,
            "rain_probability": 0,
            "sea_level_height_msl": None,
            "tide": "media",
            "uv_index": None,
            "fuente": "Open-Meteo Forecast API + Marine Weather API",
            "timezone": None,
        }
    ]
