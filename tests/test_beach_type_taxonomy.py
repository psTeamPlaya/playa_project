from backend import engine_recomendation


def test_normalize_beach_type_maps_legacy_rock_to_natural_pool():
    assert engine_recomendation._normalize_beach_type("roca") == "piscina_natural"
    assert engine_recomendation._normalize_beach_type("piscina_natural") == "piscina_natural"


def test_filter_accepts_natural_pool_type():
    playa = {"tipo": "piscina_natural", "servicios": {}}
    conditions = {"air_temp": 24, "cloud_cover": 10, "wind_speed": 8, "wave_height": 0.4}

    assert engine_recomendation.filtrar(playa, conditions, {"tipo_piscina_natural": True}) is True
    assert engine_recomendation.filtrar(playa, conditions, {"tipo_piedra": True}) is False
