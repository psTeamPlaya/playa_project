from backend import engine_recomendation
from backend.engine_recomendation import filtrar_resultados_recomendacion, fusionar_playas


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


def test_filtrar_resultados_recomendacion_aplica_filtros_estaticos():
    resultados = [
        {"tipo": "arena", "servicios": {}, "actividades_ideales": [], "condiciones": {"temperatura_ambiente": 24, "nubosidad": 20, "velocidad_viento": 10, "altura_oleaje": 1.2}},
        {"tipo": "piedra", "servicios": {}, "actividades_ideales": [], "condiciones": {"temperatura_ambiente": 21, "nubosidad": 15, "velocidad_viento": 12, "altura_oleaje": 0.8}},
        {"tipo": "roca", "servicios": {}, "actividades_ideales": [], "condiciones": {"temperatura_ambiente": 20, "nubosidad": 10, "velocidad_viento": 8, "altura_oleaje": 0.6}},
    ]

    filtrados = filtrar_resultados_recomendacion(resultados, tipo_arena=True)

    assert filtrados == [resultados[0]]


def test_filtrar_resultados_recomendacion_filtra_por_tipo_roca():
    resultados = [
        {"tipo": "arena", "servicios": {}, "actividades_ideales": [], "condiciones": {"temperatura_ambiente": 24, "nubosidad": 20, "velocidad_viento": 10, "altura_oleaje": 1.2}},
        {"tipo": "piedra", "servicios": {}, "actividades_ideales": [], "condiciones": {"temperatura_ambiente": 21, "nubosidad": 15, "velocidad_viento": 12, "altura_oleaje": 0.8}},
        {"tipo": "roca", "servicios": {}, "actividades_ideales": [], "condiciones": {"temperatura_ambiente": 20, "nubosidad": 10, "velocidad_viento": 8, "altura_oleaje": 0.6}},
    ]

    filtrados = filtrar_resultados_recomendacion(resultados, tipo_roca=True)

    assert filtrados == [resultados[2]]


def test_filtrar_resultados_recomendacion_aplica_filtros_dinamicos():
    resultados = [
        {"tipo": "arena", "servicios": {}, "actividades_ideales": [], "condiciones": {"temperatura_ambiente": 24, "nubosidad": 10, "velocidad_viento": 10, "altura_oleaje": 1.2}},
        {"tipo": "arena", "servicios": {}, "actividades_ideales": [], "condiciones": {"temperatura_ambiente": 18, "nubosidad": 10, "velocidad_viento": 10, "altura_oleaje": 1.2}},
        {"tipo": "arena", "servicios": {}, "actividades_ideales": [], "condiciones": {"temperatura_ambiente": 24, "nubosidad": 20, "velocidad_viento": 10, "altura_oleaje": 1.2}},
        {"tipo": "arena", "servicios": {}, "actividades_ideales": [], "condiciones": {"temperatura_ambiente": 24, "nubosidad": 10, "velocidad_viento": 18, "altura_oleaje": 1.2}},
        {"tipo": "arena", "servicios": {}, "actividades_ideales": [], "condiciones": {"temperatura_ambiente": 24, "nubosidad": 10, "velocidad_viento": 10, "altura_oleaje": 2.8}},
    ]

    filtrados = filtrar_resultados_recomendacion(
        resultados,
        min_temperatura_ambiente=20,
        max_temperatura_ambiente=25,
        min_nubosidad=5,
        max_nubosidad=15,
        min_velocidad_viento=5,
        max_velocidad_viento=15,
        min_altura_oleaje=0.5,
        max_altura_oleaje=2,
    )

    assert filtrados == [resultados[0]]


def test_filtrar_resultados_recomendacion_sin_filtros_devuelve_todos():
    resultados = [
        {"tipo": "arena", "servicios": {}, "actividades_ideales": [], "condiciones": {"temperatura_ambiente": 24, "nubosidad": 20, "velocidad_viento": 10, "altura_oleaje": 1.2}},
        {"tipo": "piedra", "servicios": {}, "actividades_ideales": [], "condiciones": {"temperatura_ambiente": 21, "nubosidad": 15, "velocidad_viento": 12, "altura_oleaje": 0.8}},
        {"tipo": "roca", "servicios": {}, "actividades_ideales": [], "condiciones": {"temperatura_ambiente": 20, "nubosidad": 10, "velocidad_viento": 8, "altura_oleaje": 0.6}},
    ]

    filtrados = filtrar_resultados_recomendacion(resultados)

    assert filtrados == resultados


def test_filtrar_resultados_recomendacion_aplica_filtros_por_servicio_y_actividad():
    resultados = [
        {
            "tipo": "arena",
            "servicios": {"restaurantes": True, "comida_para_llevar": True, "zona_deportiva": True, "escuela_surf": True},
            "actividades_ideales": [],
            "condiciones": {"temperatura_ambiente": 24, "nubosidad": 20, "velocidad_viento": 10, "altura_oleaje": 1.2},
        },
        {
            "tipo": "piedra",
            "servicios": {"restaurantes": False, "comida_para_llevar": True, "zona_deportiva": False, "escuela_windsurf": True},
            "actividades_ideales": [],
            "condiciones": {"temperatura_ambiente": 21, "nubosidad": 15, "velocidad_viento": 12, "altura_oleaje": 0.8},
        },
    ]

    filtrados = filtrar_resultados_recomendacion(
        resultados,
        escuela_surf=True,
        restaurantes=True,
        zona_deportiva=True,
        zona_beachvolley=True,
    )

    assert filtrados == [resultados[0]]


def test_filtrar_resultados_recomendacion_sitios_para_comer_acepta_cualquier_servicio_de_comida():
    resultados = [
        {
            "tipo": "arena",
            "servicios": {"restaurantes": True, "comida_para_llevar": False},
            "actividades_ideales": [],
            "condiciones": {"temperatura_ambiente": 24, "nubosidad": 20, "velocidad_viento": 10, "altura_oleaje": 1.2},
        },
        {
            "tipo": "arena",
            "servicios": {"restaurantes": False, "comida_para_llevar": True},
            "actividades_ideales": [],
            "condiciones": {"temperatura_ambiente": 21, "nubosidad": 15, "velocidad_viento": 12, "altura_oleaje": 0.8},
        },
        {
            "tipo": "arena",
            "servicios": {"restaurantes": False, "comida_para_llevar": False},
            "actividades_ideales": [],
            "condiciones": {"temperatura_ambiente": 22, "nubosidad": 10, "velocidad_viento": 8, "altura_oleaje": 0.6},
        },
    ]

    filtrados = filtrar_resultados_recomendacion(resultados, sitios_para_comer=True)

    assert filtrados == [resultados[0], resultados[1]]


def test_filtrar_resultados_recomendacion_escuela_kayak_sin_datos_no_devuelve_coincidencias():
    resultados = [
        {
            "tipo": "arena",
            "servicios": {"restaurantes": True, "comida_para_llevar": True, "zona_deportiva": True},
            "actividades_ideales": [{"actividad": "surf"}],
            "condiciones": {"temperatura_ambiente": 24, "nubosidad": 20, "velocidad_viento": 10, "altura_oleaje": 1.2},
        }
    ]

    filtrados = filtrar_resultados_recomendacion(resultados, escuela_kayak=True)

    assert filtrados == []


def test_recomendar_playas_con_top_n_cero_devuelve_todos(monkeypatch):
    playas = [
        {
            "id": 1,
            "nombre": "A",
            "ubicacion": "Norte",
            "latitud": 28.0,
            "longitud": -15.0,
            "descripcion": "A",
            "tipo": "arena",
            "servicios": {},
        },
        {
            "id": 2,
            "nombre": "B",
            "ubicacion": "Sur",
            "latitud": 28.1,
            "longitud": -15.1,
            "descripcion": "B",
            "tipo": "arena",
            "servicios": {},
        },
    ]
    condiciones = [
        {"beach_id": 1, "air_temp": 25, "wind_speed": 5, "cloud_cover": 10, "rain_probability": 0, "wave_height": 1, "uv_index": 6},
        {"beach_id": 2, "air_temp": 23, "wind_speed": 8, "cloud_cover": 20, "rain_probability": 5, "wave_height": 1.5, "uv_index": 5},
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
        top_n=0,
        filtros={},
    )

    assert len(resultados) == 2
    assert [resultado["beach_id"] for resultado in resultados] == [1, 2]
