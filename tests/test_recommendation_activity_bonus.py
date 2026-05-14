from backend import engine_recomendation


def test_recomendar_playas_prioriza_actividad_ideal(monkeypatch):
    playas = [
        {
            "id": 1,
            "nombre": "Playa Generica",
            "ubicacion": "Norte",
            "latitud": 28.0,
            "longitud": -15.0,
            "descripcion": "A",
            "tipo": "arena",
            "servicios": {},
            "actividades_ideales": [],
        },
        {
            "id": 2,
            "nombre": "Punta de Galdar",
            "ubicacion": "Galdar",
            "latitud": 28.1,
            "longitud": -15.1,
            "descripcion": "B",
            "tipo": "piscina_natural",
            "servicios": {},
            "actividades_ideales": ["piscina_natural"],
        },
    ]
    condiciones = [
        {"beach_id": 1, "air_temp": 24, "wind_speed": 8, "cloud_cover": 5, "rain_probability": 0, "wave_height": 0.4, "uv_index": 6},
        {"beach_id": 2, "air_temp": 24, "wind_speed": 8, "cloud_cover": 5, "rain_probability": 0, "wave_height": 0.4, "uv_index": 6},
    ]

    monkeypatch.setattr(engine_recomendation, "cargar_playas", lambda: playas)
    monkeypatch.setattr(engine_recomendation, "cargar_condiciones", lambda playas, fecha, hora: condiciones)

    resultados = engine_recomendation.recomendar_playas(
        actividad="piscina_natural",
        fecha="2026-05-07",
        hora="12:00",
        lat_usuario=None,
        lon_usuario=None,
        radio_km=None,
        top_n=0,
        filtros={},
    )

    assert resultados[0]["nombre"] == "Punta de Galdar"
    assert resultados[0]["score"] > resultados[1]["score"]


def test_score_final_no_supera_diez_aun_con_bonus_de_actividad_ideal(monkeypatch):
    playas = [
        {
            "id": 1,
            "nombre": "Playa Ideal",
            "ubicacion": "Este",
            "latitud": 28.0,
            "longitud": -15.0,
            "descripcion": "Perfecta",
            "tipo": "arena",
            "servicios": {},
            "actividades_ideales": ["tomar_sol"],
        },
    ]
    condiciones = [
        {
            "beach_id": 1,
            "air_temp": 25,
            "wind_speed": 0,
            "cloud_cover": 0,
            "rain_probability": 0,
            "wave_height": 1.5,
            "uv_index": 6,
        },
    ]

    monkeypatch.setattr(engine_recomendation, "cargar_playas", lambda: playas)
    monkeypatch.setattr(engine_recomendation, "cargar_condiciones", lambda playas, fecha, hora: condiciones)

    resultados = engine_recomendation.recomendar_playas(
        actividad="tomar_sol",
        fecha="2026-05-07",
        hora="12:00",
        lat_usuario=None,
        lon_usuario=None,
        radio_km=None,
        top_n=1,
        filtros={},
    )

    assert resultados[0]["actividad_ideal"] is True
    assert resultados[0]["score"] == 10
