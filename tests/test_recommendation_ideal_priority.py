from backend import engine_recomendation


def test_recomendar_playas_prioriza_playa_marcada_como_ideal_para_la_actividad(monkeypatch):
    playas = [
        {
            "id": 1,
            "nombre": "Playa con mejor meteo",
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
            "tipo": "piscina_natural",
            "servicios": {},
            "actividades_ideales": ["pescar"],
        },
    ]
    condiciones = [
        {"beach_id": 1, "air_temp": 23, "wind_speed": 8, "cloud_cover": 5, "rain_probability": 0, "wave_height": 0.8, "water_temp": 22},
        {"beach_id": 2, "air_temp": 22, "wind_speed": 10, "cloud_cover": 10, "rain_probability": 0, "wave_height": 0.9, "water_temp": 21},
    ]

    monkeypatch.setattr(engine_recomendation, "cargar_playas", lambda: playas)
    monkeypatch.setattr(engine_recomendation, "cargar_condiciones", lambda playas, fecha, hora: condiciones)

    resultados = engine_recomendation.recomendar_playas(
        actividad="pescar",
        fecha="2026-05-07",
        hora="12:00",
        lat_usuario=None,
        lon_usuario=None,
        radio_km=None,
        top_n=2,
        filtros={},
    )

    assert resultados[0]["nombre"] == "Punta de Gáldar"
    assert resultados[0]["actividad_ideal"] is True
