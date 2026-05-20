"""
Pruebas unitarias para la lógica de recomendación de playas.

Cubren el motor de puntuación, cálculo de distancias, filtrado,
ordenación y generación de motivos de recomendación.
"""

import pytest
import math

from backend.engine_recomendation import (
    BONUS_ACTIVIDAD_IDEAL,
    PESOS_ACTIVIDAD,
    _activity_slug,
    _normalize_beach_type,
    calcular_score,
    clamp,
    distancia_km,
    filtrar,
    generar_motivo,
    puntuar,
    recomendar_playas,
    score_cercania,
    score_inverso
)
import backend.engine_recomendation as engine_recomendation


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _playa(
    beach_id=1,
    nombre="Test",
    tipo="arena",
    lat=28.0,
    lon=-15.0,
    actividades_ideales=None,
    servicios=None,
):
    return {
        "id": beach_id,
        "nombre": nombre,
        "ubicacion": "Test",
        "latitud": lat,
        "longitud": lon,
        "descripcion": "Test",
        "tipo": tipo,
        "actividades_ideales": actividades_ideales or [],
        "servicios": servicios or {},
    }


def _cond(
    beach_id=1,
    air_temp=25.0,
    wind_speed=10.0,
    wave_height=1.0,
    water_temp=22.0,
    cloud_cover=20.0,
    rain_probability=5.0,
    uv_index=6.0,
):
    return {
        "beach_id": beach_id,
        "air_temp": air_temp,
        "wind_speed": wind_speed,
        "wave_height": wave_height,
        "water_temp": water_temp,
        "cloud_cover": cloud_cover,
        "rain_probability": rain_probability,
        "uv_index": uv_index,
    }


# ─── Tests: utilidades matemáticas ──────────────────────────────────────────

class TestClamp:
    def test_valor_dentro_del_rango(self):
        assert clamp(5) == 5

    def test_valor_por_debajo_del_minimo(self):
        assert clamp(-1) == 0

    def test_valor_por_encima_del_maximo(self):
        assert clamp(11) == 10

    def test_limites_exactos(self):
        assert clamp(0) == 0
        assert clamp(10) == 10

    def test_rango_personalizado(self):
        assert clamp(3, a=5, b=8) == 5
        assert clamp(9, a=5, b=8) == 8


class TestScoreCercania:
    def test_valor_ideal_da_diez(self):
        assert score_cercania(25, 25, 10) == 10

    def test_valor_a_tolerancia_exacta_da_cero(self):
        assert score_cercania(35, 25, 10) == 0

    def test_valor_fuera_de_tolerancia_se_clampea_a_cero(self):
        assert score_cercania(50, 25, 10) == 0

    def test_tolerancia_cero_da_cero(self):
        assert score_cercania(25, 25, 0) == 0

    def test_intermedio_da_score_proporcional(self):
        # |30 - 25| / 10 = 0.5 → 10 * 0.5 = 5
        assert score_cercania(30, 25, 10) == pytest.approx(5.0)


class TestScoreInverso:
    def test_valor_minimo_da_diez(self):
        assert score_inverso(0, 0, 30) == 10

    def test_valor_maximo_da_cero(self):
        assert score_inverso(30, 0, 30) == 0

    def test_valor_a_la_mitad_da_cinco(self):
        assert score_inverso(15, 0, 30) == pytest.approx(5.0)

    def test_min_igual_a_max_da_cero(self):
        assert score_inverso(5, 5, 5) == 0


class TestDistanciaKm:
    def test_distancia_mismo_punto_es_cero(self):
        assert distancia_km(28.0, -15.0, 28.0, -15.0) == pytest.approx(0.0)

    def test_distancia_entre_puntos_conocidos(self):
        # Las Canteras → Maspalomas ≈ 55 km
        d = distancia_km(28.1416, -15.4328, 27.7373, -15.5862)
        assert 45 < d < 60

    def test_distancia_es_simetrica(self):
        d1 = distancia_km(28.0, -15.0, 27.5, -15.5)
        d2 = distancia_km(27.5, -15.5, 28.0, -15.0)
        assert d1 == pytest.approx(d2, rel=1e-6)

    def test_distancia_positiva(self):
        d = distancia_km(28.0, -15.0, 27.9, -15.1)
        assert d > 0


# ─── Tests: normalización ────────────────────────────────────────────────────

class TestActivitySlug:
    def test_nombre_con_espacios_se_convierte_a_snake_case(self):
        assert _activity_slug("Tomar Sol") == "tomar_sol"

    def test_nombre_ya_normalizado_queda_igual(self):
        assert _activity_slug("surf") == "surf"

    def test_none_devuelve_none(self):
        assert _activity_slug(None) is None

    def test_cadena_vacia_devuelve_none(self):
        assert _activity_slug("") is None

    def test_espacios_extra_se_eliminan(self):
        assert _activity_slug("  nadar  ") == "nadar"


class TestNormalizeBeachType:
    def test_roca_se_convierte_a_piscina_natural(self):
        assert _normalize_beach_type("roca") == "piscina_natural"

    def test_arena_queda_como_arena(self):
        assert _normalize_beach_type("arena") == "arena"

    def test_piedra_queda_como_piedra(self):
        assert _normalize_beach_type("piedra") == "piedra"

    def test_none_devuelve_none(self):
        assert _normalize_beach_type(None) is None

    def test_mayusculas_se_normalizan(self):
        assert _normalize_beach_type("Roca") == "piscina_natural"

    def test_tipo_con_espacios_se_normaliza(self):
        assert _normalize_beach_type("piscina natural") == "piscina_natural"


# ─── Tests: puntuar ──────────────────────────────────────────────────────────

class TestPuntuar:
    def test_temperatura_ideal_da_score_maximo(self):
        assert puntuar("air_temp", 25) == 10

    def test_temperatura_fuera_de_rango_da_cero(self):
        assert puntuar("air_temp", 50) == 0

    def test_viento_nulo_da_score_maximo(self):
        assert puntuar("wind_speed", 0) == 10

    def test_viento_maximo_da_score_cero(self):
        assert puntuar("wind_speed", 30) == 0

    def test_nubosidad_cero_da_score_maximo(self):
        assert puntuar("cloud_cover", 0) == 10

    def test_nubosidad_total_da_score_cero(self):
        assert puntuar("cloud_cover", 100) == 0

    def test_variable_desconocida_da_cinco(self):
        assert puntuar("variable_inexistente", 50) == 5

    def test_uv_ideal_da_score_maximo(self):
        assert puntuar("uv_index", 6) == 10

    def test_altura_oleaje_ideal_da_score_maximo(self):
        assert puntuar("wave_height", 1.5) == 10

    def test_lluvia_nula_da_score_maximo(self):
        assert puntuar("rain_probability", 0) == 10


# ─── Tests: calcular_score ───────────────────────────────────────────────────

class TestCalcularScore:
    def test_actividad_conocida_devuelve_score_positivo(self):
        cond = _cond()
        score = calcular_score(cond, "tomar_sol")
        assert 0 <= score <= 10

    def test_condiciones_ideales_dan_score_alto(self):
        cond = _cond(air_temp=25, wind_speed=0, cloud_cover=0, rain_probability=0, uv_index=6)
        score = calcular_score(cond, "tomar_sol")
        assert score > 7

    def test_condiciones_malas_dan_score_bajo(self):
        cond = _cond(air_temp=5, wind_speed=30, cloud_cover=100, rain_probability=100)
        score = calcular_score(cond, "tomar_sol")
        assert score < 4

    def test_condicion_sin_datos_relevantes_da_cero(self):
        cond = {"beach_id": 1, "nombre": "test"}  # sin variables numéricas
        score = calcular_score(cond, "tomar_sol")
        assert score == 0

    def test_actividad_desconocida_da_cero(self):
        cond = _cond()
        score = calcular_score(cond, "actividad_inexistente")
        assert score == 0

    def test_surf_valora_mas_el_oleaje_que_el_viento(self):
        cond_con_oleaje = _cond(wave_height=2.5, wind_speed=5)
        cond_con_viento = _cond(wave_height=0.2, wind_speed=25)
        score_oleaje = calcular_score(cond_con_oleaje, "surf")
        score_viento = calcular_score(cond_con_viento, "surf")
        # El oleaje tiene peso 0.45 en surf vs 0.20 del viento
        assert score_oleaje > score_viento

    def test_windsurf_valora_mucho_el_viento(self):
        cond_mucho_viento = _cond(wind_speed=25)
        cond_poco_viento = _cond(wind_speed=2)
        score_alto = calcular_score(cond_mucho_viento, "windsurf")
        score_bajo = calcular_score(cond_poco_viento, "windsurf")
        assert score_alto > score_bajo

    @pytest.mark.parametrize("actividad", list(PESOS_ACTIVIDAD.keys()))
    def test_todas_las_actividades_producen_score_valido(self, actividad):
        cond = _cond()
        score = calcular_score(cond, actividad)
        assert 0 <= score <= 10


# ─── Tests: filtrar ──────────────────────────────────────────────────────────

class TestFiltrar:
    def test_sin_filtros_siempre_pasa(self):
        playa = _playa(tipo="arena")
        assert filtrar(playa, _cond(), {}) is True

    def test_filtro_tipo_arena_incluye_arena(self):
        assert filtrar(_playa(tipo="arena"), _cond(), {"tipo_arena": True}) is True

    def test_filtro_tipo_arena_excluye_roca(self):
        assert filtrar(_playa(tipo="roca"), _cond(), {"tipo_arena": True}) is False

    def test_filtro_tipo_piedra(self):
        assert filtrar(_playa(tipo="piedra"), _cond(), {"tipo_piedra": True}) is True
        assert filtrar(_playa(tipo="arena"), _cond(), {"tipo_piedra": True}) is False

    def test_filtro_tipo_piscina_natural(self):
        assert filtrar(_playa(tipo="piscina_natural"), _cond(), {"tipo_piscina_natural": True}) is True
        assert filtrar(_playa(tipo="arena"), _cond(), {"tipo_piscina_natural": True}) is False

    def test_filtro_restaurantes_presente(self):
        playa_con = _playa(servicios={"restaurantes": True})
        playa_sin = _playa(servicios={})
        assert filtrar(playa_con, _cond(), {"restaurantes": True}) is True
        assert filtrar(playa_sin, _cond(), {"restaurantes": True}) is False

    def test_filtro_pet_friendly(self):
        playa = _playa(servicios={"pet_friendly": True})
        assert filtrar(playa, _cond(), {"pet_friendly": True}) is True
        assert filtrar(_playa(), _cond(), {"pet_friendly": True}) is False

    def test_filtro_min_velocidad_viento(self):
        cond_fuerte = _cond(wind_speed=20)
        cond_flojo = _cond(wind_speed=5)
        assert filtrar(_playa(), cond_fuerte, {"min_velocidad_viento": 15}) is True
        assert filtrar(_playa(), cond_flojo, {"min_velocidad_viento": 15}) is False

    def test_filtro_max_velocidad_viento(self):
        cond_fuerte = _cond(wind_speed=20)
        cond_flojo = _cond(wind_speed=5)
        assert filtrar(_playa(), cond_fuerte, {"max_velocidad_viento": 15}) is False
        assert filtrar(_playa(), cond_flojo, {"max_velocidad_viento": 15}) is True

    def test_filtro_temperatura_ambiente(self):
        cond = _cond(air_temp=24)
        assert filtrar(_playa(), cond, {"min_temperatura_ambiente": 20, "max_temperatura_ambiente": 28}) is True
        assert filtrar(_playa(), cond, {"min_temperatura_ambiente": 26}) is False
        assert filtrar(_playa(), cond, {"max_temperatura_ambiente": 22}) is False

    def test_filtro_nubosidad(self):
        cond = _cond(cloud_cover=30)
        assert filtrar(_playa(), cond, {"min_nubosidad": 10, "max_nubosidad": 50}) is True
        assert filtrar(_playa(), cond, {"max_nubosidad": 20}) is False

    def test_filtro_altura_oleaje(self):
        cond = _cond(wave_height=1.5)
        assert filtrar(_playa(), cond, {"min_altura_oleaje": 1.0, "max_altura_oleaje": 2.0}) is True
        assert filtrar(_playa(), cond, {"max_altura_oleaje": 1.0}) is False

    def test_multiples_filtros_todos_deben_cumplirse(self):
        playa = _playa(tipo="arena", servicios={"restaurantes": True})
        cond = _cond(wind_speed=10, air_temp=24)
        filtros = {
            "tipo_arena": True,
            "restaurantes": True,
            "max_velocidad_viento": 15,
            "min_temperatura_ambiente": 20,
        }
        assert filtrar(playa, cond, filtros) is True

    def test_fallo_en_un_filtro_excluye_la_playa(self):
        playa = _playa(tipo="arena", servicios={"restaurantes": True})
        cond = _cond(wind_speed=20)  # supera max_velocidad_viento
        filtros = {"tipo_arena": True, "restaurantes": True, "max_velocidad_viento": 15}
        assert filtrar(playa, cond, filtros) is False


# ─── Tests: bonus de actividad ideal ─────────────────────────────────────────

class TestBonusActividadIdeal:
    def test_actividad_ideal_suma_bonus_al_score(self, monkeypatch):
        playa = _playa(actividades_ideales=["surf"])
        cond = _cond()

        monkeypatch.setattr(engine_recomendation, "cargar_playas", lambda: [playa])
        monkeypatch.setattr(engine_recomendation, "cargar_condiciones", lambda p, f, h: [cond])

        resultados = engine_recomendation.recomendar_playas(
            actividad="surf", fecha="2026-06-01", hora="12:00",
            lat_usuario=None, lon_usuario=None, radio_km=None, top_n=0, filtros={},
        )
        score_con_bonus = resultados[0]["score"]
        score_sin_bonus = calcular_score(cond, "surf")

        assert score_con_bonus == pytest.approx(score_sin_bonus + BONUS_ACTIVIDAD_IDEAL, abs=0.01)
        assert resultados[0]["actividad_ideal"] is True

    def test_actividad_no_ideal_no_suma_bonus(self, monkeypatch):
        playa = _playa(actividades_ideales=[])  # no tiene actividad ideal
        cond = _cond()

        monkeypatch.setattr(engine_recomendation, "cargar_playas", lambda: [playa])
        monkeypatch.setattr(engine_recomendation, "cargar_condiciones", lambda p, f, h: [cond])

        resultados = engine_recomendation.recomendar_playas(
            actividad="surf", fecha="2026-06-01", hora="12:00",
            lat_usuario=None, lon_usuario=None, radio_km=None, top_n=0, filtros={},
        )
        assert resultados[0]["actividad_ideal"] is False
        assert resultados[0]["score"] == pytest.approx(calcular_score(cond, "surf"), abs=0.01)


# ─── Tests: recomendar_playas ────────────────────────────────────────────────

class TestRecomendarPlayas:
    """Tests de la función principal de recomendación."""

    def _base_setup(self, monkeypatch, playas, condiciones):
        monkeypatch.setattr(engine_recomendation, "cargar_playas", lambda: playas)
        monkeypatch.setattr(engine_recomendation, "cargar_condiciones", lambda p, f, h: condiciones)

    def test_devuelve_top_n_resultados(self, monkeypatch):
        playas = [_playa(beach_id=i, lat=28.0 + i * 0.01, lon=-15.0) for i in range(5)]
        condiciones = [_cond(beach_id=i) for i in range(5)]
        self._base_setup(monkeypatch, playas, condiciones)

        resultados = engine_recomendation.recomendar_playas(
            actividad="nadar", fecha="2026-06-01", hora="12:00",
            lat_usuario=None, lon_usuario=None, radio_km=None, top_n=3, filtros={},
        )
        assert len(resultados) == 3

    def test_top_n_cero_devuelve_todos(self, monkeypatch):
        playas = [_playa(beach_id=i) for i in range(4)]
        condiciones = [_cond(beach_id=i) for i in range(4)]
        self._base_setup(monkeypatch, playas, condiciones)

        resultados = engine_recomendation.recomendar_playas(
            actividad="nadar", fecha="2026-06-01", hora="12:00",
            lat_usuario=None, lon_usuario=None, radio_km=None, top_n=0, filtros={},
        )
        assert len(resultados) == 4

    def test_resultados_ordenados_por_score_descendente(self, monkeypatch):
        p1 = _playa(beach_id=1)
        p2 = _playa(beach_id=2)
        # p1 con buenas condiciones para tomar_sol, p2 con malas
        c1 = _cond(beach_id=1, air_temp=25, wind_speed=0, cloud_cover=0, rain_probability=0, uv_index=6)
        c2 = _cond(beach_id=2, air_temp=5, wind_speed=30, cloud_cover=100, rain_probability=100)
        self._base_setup(monkeypatch, [p1, p2], [c1, c2])

        resultados = engine_recomendation.recomendar_playas(
            actividad="tomar_sol", fecha="2026-06-01", hora="12:00",
            lat_usuario=None, lon_usuario=None, radio_km=None, top_n=0, filtros={},
        )
        scores = [r["score"] for r in resultados]
        assert scores == sorted(scores, reverse=True)

    def test_playa_ideal_aparece_antes_que_la_no_ideal_con_mejor_score(self, monkeypatch):
        p_ideal = _playa(beach_id=1, actividades_ideales=["tomar_sol"])
        p_normal = _playa(beach_id=2)
        # Damos condiciones ligeramente peores a la playa ideal pero la actividad ideal compensa
        c_ideal = _cond(beach_id=1, cloud_cover=50)
        c_normal = _cond(beach_id=2, cloud_cover=0)
        self._base_setup(monkeypatch, [p_normal, p_ideal], [c_normal, c_ideal])

        resultados = engine_recomendation.recomendar_playas(
            actividad="tomar_sol", fecha="2026-06-01", hora="12:00",
            lat_usuario=None, lon_usuario=None, radio_km=None, top_n=0, filtros={},
        )
        # La ideal debe estar primera (por el bonus de actividad_ideal)
        assert resultados[0]["beach_id"] == 1

    def test_filtra_por_radio_km(self, monkeypatch):
        cerca = _playa(beach_id=1, lat=28.14, lon=-15.43)   # ~0 km del usuario
        lejos = _playa(beach_id=2, lat=27.74, lon=-15.59)   # ~55 km del usuario
        condiciones = [_cond(beach_id=1), _cond(beach_id=2)]
        self._base_setup(monkeypatch, [cerca, lejos], condiciones)

        resultados = engine_recomendation.recomendar_playas(
            actividad="nadar", fecha="2026-06-01", hora="12:00",
            lat_usuario=28.14, lon_usuario=-15.43, radio_km=10, top_n=0, filtros={},
        )
        assert len(resultados) == 1
        assert resultados[0]["beach_id"] == 1

    def test_sin_condiciones_disponibles_no_devuelve_resultados(self, monkeypatch):
        playas = [_playa()]
        self._base_setup(monkeypatch, playas, condiciones=[])  # sin condiciones

        resultados = engine_recomendation.recomendar_playas(
            actividad="surf", fecha="2026-06-01", hora="12:00",
            lat_usuario=None, lon_usuario=None, radio_km=None, top_n=0, filtros={},
        )
        assert resultados == []

    def test_sin_playas_devuelve_lista_vacia(self, monkeypatch):
        self._base_setup(monkeypatch, playas=[], condiciones=[])

        resultados = engine_recomendation.recomendar_playas(
            actividad="surf", fecha="2026-06-01", hora="12:00",
            lat_usuario=None, lon_usuario=None, radio_km=None, top_n=5, filtros={},
        )
        assert resultados == []

    def test_resultado_incluye_campo_motivo(self, monkeypatch):
        self._base_setup(monkeypatch, [_playa()], [_cond()])

        resultados = engine_recomendation.recomendar_playas(
            actividad="nadar", fecha="2026-06-01", hora="12:00",
            lat_usuario=None, lon_usuario=None, radio_km=None, top_n=1, filtros={},
        )
        assert "motivo" in resultados[0]
        assert len(resultados[0]["motivo"]) > 0

    def test_filtros_de_servicio_aplicados_en_recomendar_playas(self, monkeypatch):
        p_con_rest = _playa(beach_id=1, servicios={"restaurantes": True})
        p_sin_rest = _playa(beach_id=2, servicios={})
        condiciones = [_cond(beach_id=1), _cond(beach_id=2)]
        self._base_setup(monkeypatch, [p_con_rest, p_sin_rest], condiciones)

        resultados = engine_recomendation.recomendar_playas(
            actividad="caminar", fecha="2026-06-01", hora="12:00",
            lat_usuario=None, lon_usuario=None, radio_km=None, top_n=0,
            filtros={"restaurantes": True},
        )
        assert len(resultados) == 1
        assert resultados[0]["beach_id"] == 1


# ─── Tests: generar_motivo ───────────────────────────────────────────────────

class TestGenerarMotivo:
    def test_tomar_sol_cielo_despejado(self):
        cond = _cond(cloud_cover=0, air_temp=25, rain_probability=0)
        motivo = generar_motivo("tomar_sol", cond)
        assert "sol" in motivo.lower() or "despejado" in motivo.lower()

    def test_surf_con_oleaje(self):
        cond = _cond(wave_height=2.0)
        motivo = generar_motivo("surf", cond)
        assert motivo  # debe devolver algún texto

    def test_nadar_mar_tranquilo(self):
        cond = _cond(wave_height=0.5, wind_speed=8)
        motivo = generar_motivo("nadar", cond)
        assert motivo

    def test_actividad_desconocida_devuelve_mensaje_generico(self):
        cond = _cond()
        motivo = generar_motivo("actividad_rara", cond)
        assert motivo == "Condiciones evaluadas para la actividad."

    @pytest.mark.parametrize("actividad", [
        "tomar_sol", "surf", "nadar", "windsurf", "bucear",
        "caminar", "pescar", "kayak", "kitesurf", "piscina_natural",
    ])
    def test_todas_las_actividades_generan_motivo_no_vacio(self, actividad):
        cond = _cond()
        motivo = generar_motivo(actividad, cond)
        assert isinstance(motivo, str) and len(motivo) > 0