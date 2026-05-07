from backend import engine_recomendation


def test_cargar_condiciones_normaliza_openmeteo_para_playas_nuevas(monkeypatch):
    playas = [
        {"id": 99, "nombre": "Punta de Gáldar", "latitud": 28.169189, "longitud": -15.682056},
    ]

    monkeypatch.setattr(
        engine_recomendation,
        "obtener_condiciones_open_meteo",
        lambda **kwargs: [
            {
                "beach_id": 99,
                "nombre_playa": "Punta de Gáldar",
                "fecha": "2026-05-07",
                "hora": "12:00",
                "temperatura_ambiente": 24.0,
                "velocidad_viento": 8.0,
                "altura_oleaje": 0.4,
                "temperatura_agua": 21.0,
                "nubosidad": 10,
                "probabilidad_lluvia": 0,
                "marea": "media",
            }
        ],
    )

    condiciones = engine_recomendation.cargar_condiciones(playas, "2026-05-07", "12:00")

    assert condiciones == [
        {
            "beach_id": 99,
            "nombre_playa": "Punta de Gáldar",
            "fecha": "2026-05-07",
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
            "fuente": None,
            "timezone": None,
        }
    ]
