from backend.engine_recomendation import fusionar_playas


def test_fusionar_playas_sobrescribe_coordenadas_desde_db():
    playas_locales = [
        {
            "id": 1,
            "nombre": "Las Canteras",
            "ubicacion": "Las Palmas",
            "latitud": 28.10,
            "longitud": -15.40,
            "tipo": "arena",
            "descripcion": "Local",
            "actividades_ideales": [{"actividad": "nadar", "condicion": "ideal"}],
            "servicios": {"restaurantes": True},
            "imagen": "las_canteras.jpg",
            "accesibilidad": "alta",
        }
    ]
    playas_db = [
        {
            "id": 1,
            "nombre": "Las Canteras",
            "ubicacion": "Las Palmas de Gran Canaria",
            "latitud": 28.1416,
            "longitud": -15.4328,
            "tipo": "arena",
            "descripcion": "DB",
            "imagen": "db.jpg",
            "accesibilidad": True,
        }
    ]

    fusionadas = fusionar_playas(playas_locales, playas_db)

    assert fusionadas[0]["latitud"] == 28.1416
    assert fusionadas[0]["longitud"] == -15.4328
    assert fusionadas[0]["actividades_ideales"] == [{"actividad": "nadar", "condicion": "ideal"}]
    assert fusionadas[0]["servicios"] == {"restaurantes": True}


def test_fusionar_playas_agrega_playa_de_db_si_no_existe_en_json():
    playas_locales = []
    playas_db = [
        {
            "id": 9,
            "nombre": "Nueva Playa",
            "ubicacion": "Mogan",
            "latitud": 27.0,
            "longitud": -15.0,
            "tipo": "arena",
            "descripcion": "Importada desde la base",
            "imagen": "nueva.jpg",
            "accesibilidad": False,
        }
    ]

    fusionadas = fusionar_playas(playas_locales, playas_db)

    assert fusionadas == [
        {
            "id": 9,
            "nombre": "Nueva Playa",
            "ubicacion": "Mogan",
            "latitud": 27.0,
            "longitud": -15.0,
            "tipo": "arena",
            "descripcion": "Importada desde la base",
            "actividades_ideales": [],
            "servicios": {},
            "imagen": "nueva.jpg",
            "accesibilidad": False,
        }
    ]
