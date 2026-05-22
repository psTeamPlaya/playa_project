"""
Pruebas de integración para la comunicación con servicios externos.

Usa `responses` para interceptar las llamadas HTTP a Open-Meteo y simular
distintos escenarios (éxito, error, timeout, datos vacíos) sin realizar
peticiones reales a la red.
"""

import pytest
import responses as rsps_lib
from responses import RequestsMock

from backend.weather_provider import (
    OpenMeteoError,
    WEATHER_URL,
    MARINE_URL,
    _fetch_json,
    _fetch_weather_batch,
    _fetch_marine_batch,
    _normalize_batch_response,
    _infer_marea,
    obtener_condiciones_open_meteo,
)
from backend.sunlight_provider import (
    SunlightError,
    SUNLIGHT_URL,
    _fetch_sunrise_sunset,
    obtener_aviso_luz_solar,
)


# ─── Helpers de fixtures ─────────────────────────────────────────────────────

TIMESTAMP = "2026-06-01T12:00"
FECHA = "2026-06-01"
HORA = "12:00"
TIMEZONE = "Atlantic/Canary"
TIMEOUT = 5

PLAYA_A = {"id": 1, "nombre": "Las Canteras", "latitud": 28.1416, "longitud": -15.4328}
PLAYA_B = {"id": 2, "nombre": "Maspalomas", "latitud": 27.7373, "longitud": -15.5862}

WEATHER_RESPONSE_SINGLE = {
    "hourly": {
        "time": [TIMESTAMP],
        "temperature_2m": [24.5],
        "wind_speed_10m": [12.0],
        "cloud_cover": [20],
        "precipitation_probability": [5],
    }
}

MARINE_RESPONSE_SINGLE = {
    "hourly": {
        "time": [TIMESTAMP],
        "wave_height": [0.8],
        "sea_surface_temperature": [21.0],
        "sea_level_height_msl": [0.15],
    }
}

SUNLIGHT_RESPONSE = {
    "daily": {
        "sunrise": ["2026-06-01T07:08"],
        "sunset": ["2026-06-01T20:42"],
    }
}


# ─── Fixture que limpia la caché LRU antes de cada test ─────────────────────

@pytest.fixture(autouse=True)
def limpiar_cache():
    _fetch_weather_batch.cache_clear()
    _fetch_marine_batch.cache_clear()
    _fetch_sunrise_sunset.cache_clear()
    yield
    _fetch_weather_batch.cache_clear()
    _fetch_marine_batch.cache_clear()
    _fetch_sunrise_sunset.cache_clear()


# ─── Tests: _fetch_json ──────────────────────────────────────────────────────

class TestFetchJson:
    """Prueba el helper interno que realiza la petición HTTP y parsea JSON."""

    @rsps_lib.activate
    def test_peticion_exitosa_devuelve_json(self):
        rsps_lib.add(rsps_lib.GET, "https://example.com/data", json={"key": "value"}, status=200)
        result = _fetch_json("https://example.com/data", {}, timeout_seconds=TIMEOUT)
        assert result == {"key": "value"}

    @rsps_lib.activate
    def test_error_http_lanza_open_meteo_error(self):
        rsps_lib.add(rsps_lib.GET, "https://example.com/data", status=500)
        with pytest.raises(OpenMeteoError, match="Open-Meteo request failed"):
            _fetch_json("https://example.com/data", {}, timeout_seconds=TIMEOUT)

    @rsps_lib.activate
    def test_timeout_lanza_open_meteo_error(self):
        import requests
        rsps_lib.add(rsps_lib.GET, "https://example.com/data", body=requests.exceptions.Timeout())
        with pytest.raises(OpenMeteoError, match="Open-Meteo request failed"):
            _fetch_json("https://example.com/data", {}, timeout_seconds=TIMEOUT)

    @rsps_lib.activate
    def test_connection_error_lanza_open_meteo_error(self):
        import requests
        rsps_lib.add(
            rsps_lib.GET, "https://example.com/data",
            body=requests.exceptions.ConnectionError("refused")
        )
        with pytest.raises(OpenMeteoError):
            _fetch_json("https://example.com/data", {}, timeout_seconds=TIMEOUT)


# ─── Tests: _normalize_batch_response ───────────────────────────────────────

class TestNormalizeBatchResponse:
    def test_lista_se_convierte_en_tupla(self):
        data = [{"a": 1}, {"b": 2}]
        result = _normalize_batch_response(data)
        assert isinstance(result, tuple)
        assert len(result) == 2

    def test_dict_se_envuelve_en_tupla(self):
        data = {"a": 1}
        result = _normalize_batch_response(data)
        assert result == ({"a": 1},)

    def test_tipo_inesperado_lanza_open_meteo_error(self):
        with pytest.raises(OpenMeteoError, match="unexpected payload"):
            _normalize_batch_response("texto_inesperado")


# ─── Tests: obtener_condiciones_open_meteo ───────────────────────────────────

class TestObtenerCondicionesOpenMeteo:
    """Integración completa: llama a los endpoints de Open-Meteo (simulados)."""

    @rsps_lib.activate
    def test_devuelve_condicion_para_una_playa(self):
        rsps_lib.add(rsps_lib.GET, WEATHER_URL, json=WEATHER_RESPONSE_SINGLE)
        rsps_lib.add(rsps_lib.GET, MARINE_URL, json=MARINE_RESPONSE_SINGLE)

        condiciones = obtener_condiciones_open_meteo(
            playas=[PLAYA_A], fecha=FECHA, hora=HORA,
            timezone=TIMEZONE, timeout_seconds=TIMEOUT,
        )

        assert len(condiciones) == 1
        cond = condiciones[0]
        assert cond["beach_id"] == PLAYA_A["id"]
        assert cond["temperatura_ambiente"] == 24.5
        assert cond["altura_oleaje"] == 0.8
        assert cond["fuente"] == "Open-Meteo Forecast API + Marine Weather API"

    @rsps_lib.activate
    def test_devuelve_condiciones_para_multiples_playas(self):
        weather_multi = {
            "hourly": {
                "time": [TIMESTAMP],
                "temperature_2m": [24.5, 26.0],
                "wind_speed_10m": [12.0, 8.0],
                "cloud_cover": [20, 10],
                "precipitation_probability": [5, 2],
            }
        }
        marine_multi = {
            "hourly": {
                "time": [TIMESTAMP],
                "wave_height": [0.8, 1.2],
                "sea_surface_temperature": [21.0, 22.0],
                "sea_level_height_msl": [0.15, -0.05],
            }
        }
        rsps_lib.add(rsps_lib.GET, WEATHER_URL, json=[weather_multi, weather_multi])
        rsps_lib.add(rsps_lib.GET, MARINE_URL, json=[marine_multi, marine_multi])

        condiciones = obtener_condiciones_open_meteo(
            playas=[PLAYA_A, PLAYA_B], fecha=FECHA, hora=HORA,
            timezone=TIMEZONE, timeout_seconds=TIMEOUT,
        )

        assert len(condiciones) == 2
        assert {c["beach_id"] for c in condiciones} == {1, 2}

    @rsps_lib.activate
    def test_lanza_error_si_weather_api_falla(self):
        rsps_lib.add(rsps_lib.GET, WEATHER_URL, status=503)
        rsps_lib.add(rsps_lib.GET, MARINE_URL, json=MARINE_RESPONSE_SINGLE)

        with pytest.raises(OpenMeteoError):
            obtener_condiciones_open_meteo(
                playas=[PLAYA_A], fecha=FECHA, hora=HORA,
                timezone=TIMEZONE, timeout_seconds=TIMEOUT,
            )

    @rsps_lib.activate
    def test_lanza_error_si_marine_api_falla(self):
        rsps_lib.add(rsps_lib.GET, WEATHER_URL, json=WEATHER_RESPONSE_SINGLE)
        rsps_lib.add(rsps_lib.GET, MARINE_URL, status=429)

        with pytest.raises(OpenMeteoError):
            obtener_condiciones_open_meteo(
                playas=[PLAYA_A], fecha=FECHA, hora=HORA,
                timezone=TIMEZONE, timeout_seconds=TIMEOUT,
            )

    @rsps_lib.activate
    def test_lanza_error_si_timestamp_no_esta_en_la_respuesta(self):
        weather_sin_timestamp = {
            "hourly": {
                "time": ["2025-01-01T10:00"],   # timestamp distinto
                "temperature_2m": [20.0],
                "wind_speed_10m": [5.0],
                "cloud_cover": [50],
                "precipitation_probability": [10],
            }
        }
        marine_sin_timestamp = {
            "hourly": {
                "time": ["2025-01-01T10:00"],
                "wave_height": [0.5],
                "sea_surface_temperature": [20.0],
                "sea_level_height_msl": [0.0],
            }
        }
        rsps_lib.add(rsps_lib.GET, WEATHER_URL, json=weather_sin_timestamp)
        rsps_lib.add(rsps_lib.GET, MARINE_URL, json=marine_sin_timestamp)

        with pytest.raises(OpenMeteoError, match="no hourly data"):
            obtener_condiciones_open_meteo(
                playas=[PLAYA_A], fecha=FECHA, hora=HORA,
                timezone=TIMEZONE, timeout_seconds=TIMEOUT,
            )

    def test_lista_vacia_de_playas_devuelve_lista_vacia(self):
        condiciones = obtener_condiciones_open_meteo(
            playas=[], fecha=FECHA, hora=HORA,
            timezone=TIMEZONE, timeout_seconds=TIMEOUT,
        )
        assert condiciones == []

    @rsps_lib.activate
    def test_condicion_incluye_campo_marea_inferida(self):
        rsps_lib.add(rsps_lib.GET, WEATHER_URL, json=WEATHER_RESPONSE_SINGLE)
        rsps_lib.add(rsps_lib.GET, MARINE_URL, json=MARINE_RESPONSE_SINGLE)

        condiciones = obtener_condiciones_open_meteo(
            playas=[PLAYA_A], fecha=FECHA, hora=HORA,
            timezone=TIMEZONE, timeout_seconds=TIMEOUT,
        )
        # sea_level_height_msl = 0.15 → marea "alta"
        assert condiciones[0]["marea"] == "alta"


# ─── Tests: _infer_marea ─────────────────────────────────────────────────────

class TestInferMarea:
    def test_nivel_alto_devuelve_alta(self):
        assert _infer_marea(0.10) == "alta"
        assert _infer_marea(0.50) == "alta"

    def test_nivel_bajo_devuelve_baja(self):
        assert _infer_marea(-0.10) == "baja"
        assert _infer_marea(-0.80) == "baja"

    def test_nivel_medio_devuelve_media(self):
        assert _infer_marea(0.05) == "media"
        assert _infer_marea(-0.05) == "media"
        assert _infer_marea(0.0) == "media"

    def test_none_devuelve_media(self):
        assert _infer_marea(None) == "media"


# ─── Tests: servicio de luz solar ────────────────────────────────────────────

class TestSunlightProvider:
    """Pruebas de integración para la consulta de amanecer/atardecer."""

    @rsps_lib.activate
    def test_fetch_sunrise_sunset_devuelve_datetimes(self):
        rsps_lib.add(rsps_lib.GET, SUNLIGHT_URL, json=SUNLIGHT_RESPONSE)

        from datetime import datetime
        sunrise, sunset = _fetch_sunrise_sunset(
            28.14, -15.43, FECHA, TIMEZONE, TIMEOUT
        )
        assert sunrise == datetime.fromisoformat("2026-06-01T07:08")
        assert sunset == datetime.fromisoformat("2026-06-01T20:42")

    @rsps_lib.activate
    def test_fetch_sunrise_sunset_lanza_error_con_respuesta_vacia(self):
        rsps_lib.add(rsps_lib.GET, SUNLIGHT_URL, json={"daily": {}})

        with pytest.raises(SunlightError, match="no sunrise/sunset data"):
            _fetch_sunrise_sunset(28.14, -15.43, FECHA, TIMEZONE, TIMEOUT)

    @rsps_lib.activate
    def test_fetch_sunrise_sunset_lanza_error_http_500(self):
        rsps_lib.add(rsps_lib.GET, SUNLIGHT_URL, status=500)

        with pytest.raises(SunlightError, match="sunlight request failed"):
            _fetch_sunrise_sunset(28.14, -15.43, FECHA, TIMEZONE, TIMEOUT)

    @rsps_lib.activate
    def test_obtener_aviso_antes_del_amanecer(self):
        rsps_lib.add(rsps_lib.GET, SUNLIGHT_URL, json=SUNLIGHT_RESPONSE)
        playas = [{"latitud": 28.14, "longitud": -15.43}]

        aviso = obtener_aviso_luz_solar(
            actividad="tomar_sol", playas=playas,
            fecha=FECHA, hora="05:00",
            timezone=TIMEZONE, timeout_seconds=TIMEOUT,
        )
        assert aviso is not None
        assert aviso["tipo"] == "antes_amanecer"
        assert "07:08" in aviso["mensaje"]

    @rsps_lib.activate
    def test_obtener_aviso_despues_del_atardecer(self):
        rsps_lib.add(rsps_lib.GET, SUNLIGHT_URL, json=SUNLIGHT_RESPONSE)
        playas = [{"latitud": 28.14, "longitud": -15.43}]

        aviso = obtener_aviso_luz_solar(
            actividad="tomar_sol", playas=playas,
            fecha=FECHA, hora="21:30",
            timezone=TIMEZONE, timeout_seconds=TIMEOUT,
        )
        assert aviso is not None
        assert aviso["tipo"] == "despues_atardecer"
        assert "20:42" in aviso["mensaje"]

    @rsps_lib.activate
    def test_obtener_aviso_durante_el_dia_devuelve_none(self):
        rsps_lib.add(rsps_lib.GET, SUNLIGHT_URL, json=SUNLIGHT_RESPONSE)
        playas = [{"latitud": 28.14, "longitud": -15.43}]

        aviso = obtener_aviso_luz_solar(
            actividad="tomar_sol", playas=playas,
            fecha=FECHA, hora="12:00",
            timezone=TIMEZONE, timeout_seconds=TIMEOUT,
        )
        assert aviso is None

    def test_obtener_aviso_con_actividad_distinta_devuelve_none(self):
        """Para actividades que no sean 'tomar_sol' no debe hacer peticiones."""
        aviso = obtener_aviso_luz_solar(
            actividad="surf", playas=[{"latitud": 28.14, "longitud": -15.43}],
            fecha=FECHA, hora="06:00",
            timezone=TIMEZONE, timeout_seconds=TIMEOUT,
        )
        assert aviso is None

    def test_obtener_aviso_sin_playas_devuelve_none(self):
        aviso = obtener_aviso_luz_solar(
            actividad="tomar_sol", playas=[],
            fecha=FECHA, hora="06:00",
            timezone=TIMEZONE, timeout_seconds=TIMEOUT,
        )
        assert aviso is None

    @rsps_lib.activate
    def test_coordenadas_representativas_son_la_media_de_las_playas(self):
        """Verifica que las coordenadas enviadas a la API son el centroide."""
        rsps_lib.add(rsps_lib.GET, SUNLIGHT_URL, json=SUNLIGHT_RESPONSE)
        playas = [
            {"latitud": 28.0, "longitud": -15.0},
            {"latitud": 28.2, "longitud": -15.2},
        ]
        # No debe lanzar error; las coordenadas medias serán (28.1, -15.1)
        obtener_aviso_luz_solar(
            actividad="tomar_sol", playas=playas,
            fecha=FECHA, hora="12:00",
            timezone=TIMEZONE, timeout_seconds=TIMEOUT,
        )
        assert len(rsps_lib.calls) == 1
        url_llamada = rsps_lib.calls[0].request.url
        assert "28.1" in url_llamada