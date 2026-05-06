from backend import engine_recomendation


def test_recomendar_playas_prioriza_actividad_ideal(monkeypatch):
    playas = [
        {
            "id": 1,
            "nombre": "Playa Genérica",
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
            "nombre": "Punta de Gáldar",
            "ubicacion": "Gáldar",
            "latitud": 28.1,
            "longitud": -15.1,
            "descripcion": "B",
            "tipo": "roca",
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

    assert resultados[0]["nombre"] == "Punta de Gáldar"
    assert resultados[0]["score"] > resultados[1]["score"]
