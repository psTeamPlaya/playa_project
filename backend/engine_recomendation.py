from __future__ import annotations

import json
import unicodedata
from pathlib import Path
from typing import Any

from backend.config import settings
from backend.db import SessionLocal
from backend.models.beach import Beach
from backend.weather_provider import OpenMeteoError, obtener_condiciones_open_meteo

BASE_DIR = Path(__file__).resolve().parent
PLAYAS_FILE = BASE_DIR / "playas.json"
CONDICIONES_FILE = BASE_DIR / "condiciones_playas.json"


# =========================================================
# CARGA DE DATOS
# =========================================================

def cargar_json(ruta: Path) -> list[dict[str, Any]]:
    with ruta.open("r", encoding="utf-8") as f:
        return json.load(f)


def cargar_playas() -> list[dict[str, Any]]:
    playas_locales = cargar_json(PLAYAS_FILE)
    playas_db = cargar_playas_desde_db()

    if not playas_db:
        return playas_locales

    return fusionar_playas(playas_locales, playas_db)


def cargar_condiciones() -> list[dict[str, Any]]:
    return cargar_json(CONDICIONES_FILE)


def _normalizar_identificador_texto(valor: str | None) -> str:
    if not valor:
        return ""

    normalizado = unicodedata.normalize("NFKD", valor)
    ascii_only = normalizado.encode("ascii", "ignore").decode("ascii")
    return " ".join(ascii_only.lower().split())


def cargar_playas_desde_db() -> list[dict[str, Any]]:
    session = SessionLocal()

    try:
        playas = session.query(Beach).order_by(Beach.id.asc()).all()
    except Exception:
        return []
    finally:
        session.close()

    return [
        {
            "id": playa.id,
            "nombre": playa.name,
            "ubicacion": playa.location,
            "latitud": float(playa.latitude),
            "longitud": float(playa.longitude),
            "tipo": playa.type,
            "descripcion": playa.description,
            "imagen": playa.image,
            "accesibilidad": playa.accessibility,
        }
        for playa in playas
    ]


def fusionar_playas(
    playas_locales: list[dict[str, Any]],
    playas_db: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    playas_por_id = {
        playa["id"]: dict(playa)
        for playa in playas_locales
    }
    playas_por_nombre = {
        _normalizar_identificador_texto(playa.get("nombre")): playa["id"]
        for playa in playas_locales
    }

    siguiente_id = max(playas_por_id, default=0) + 1

    for playa_db in playas_db:
        beach_id = playa_db.get("id")
        playa_local = playas_por_id.get(beach_id)

        if playa_local is None:
            nombre_normalizado = _normalizar_identificador_texto(playa_db.get("nombre"))
            playa_local_id = playas_por_nombre.get(nombre_normalizado)
            playa_local = playas_por_id.get(playa_local_id) if playa_local_id is not None else None

        if playa_local is None:
            playa_nueva = {
                "id": beach_id if beach_id is not None else siguiente_id,
                "nombre": playa_db.get("nombre") or "Playa sin nombre",
                "ubicacion": playa_db.get("ubicacion") or "",
                "latitud": playa_db.get("latitud"),
                "longitud": playa_db.get("longitud"),
                "tipo": playa_db.get("tipo") or "desconocido",
                "descripcion": playa_db.get("descripcion") or "",
                "actividades_ideales": [],
                "servicios": {},
                "imagen": playa_db.get("imagen") or "",
                "accesibilidad": playa_db.get("accesibilidad"),
            }
            playas_por_id[playa_nueva["id"]] = playa_nueva
            playas_por_nombre[_normalizar_identificador_texto(playa_nueva["nombre"])] = playa_nueva["id"]
            siguiente_id = max(siguiente_id, playa_nueva["id"] + 1)
            continue

        for campo, valor in playa_db.items():
            if valor is not None:
                playa_local[campo] = valor

    return [
        playas_por_id[beach_id]
        for beach_id in sorted(playas_por_id)
    ]


def cargar_condiciones_locales_filtradas(fecha: str, hora: str) -> list[dict[str, Any]]:
    return [
        condicion
        for condicion in cargar_condiciones()
        if condicion.get("fecha") == fecha and condicion.get("hora") == hora
    ]


def cargar_condiciones_para_busqueda(
    playas: list[dict[str, Any]],
    fecha: str,
    hora: str,
) -> list[dict[str, Any]]:
    condiciones_locales = cargar_condiciones_locales_filtradas(fecha, hora)

    if settings.WEATHER_PROVIDER == "local":
        return condiciones_locales

    try:
        condiciones_remotas = obtener_condiciones_open_meteo(
            playas=playas,
            fecha=fecha,
            hora=hora,
            timezone=settings.OPEN_METEO_TIMEZONE,
            timeout_seconds=settings.OPEN_METEO_TIMEOUT_SECONDS,
        )
    except OpenMeteoError:
        return condiciones_locales

    condiciones_por_playa = {
        condicion["beach_id"]: condicion
        for condicion in condiciones_remotas
    }

    for condicion_local in condiciones_locales:
        condiciones_por_playa.setdefault(condicion_local["beach_id"], condicion_local)

    return list(condiciones_por_playa.values())


# =========================================================
# UTILIDADES
# =========================================================

def clamp(valor: float, minimo: float = 0.0, maximo: float = 10.0) -> float:
    return max(minimo, min(valor, maximo))


def normalizar_positivo(valor: float, minimo: float, maximo: float) -> float:
    """
    Devuelve una puntuación entre 0 y 10.
    Cuanto mayor sea el valor original, mejor puntuación.
    """
    if maximo == minimo:
        return 0.0
    score = ((valor - minimo) / (maximo - minimo)) * 10
    return clamp(score)


def normalizar_inverso(valor: float, minimo: float, maximo: float) -> float:
    """
    Devuelve una puntuación entre 0 y 10.
    Cuanto menor sea el valor original, mejor puntuación.
    """
    if maximo == minimo:
        return 0.0
    score = ((maximo - valor) / (maximo - minimo)) * 10
    return clamp(score)


def puntuacion_cercania(valor: float, ideal: float, tolerancia: float) -> float:
    """
    Puntúa entre 0 y 10 según cercanía a un valor ideal.
    Si se aleja demasiado del ideal, baja hacia 0.
    """
    if tolerancia <= 0:
        return 0.0
    distancia = abs(valor - ideal)
    score = 10 * (1 - distancia / tolerancia)
    return clamp(score)


def puntuacion_categorica(valor: str, mapa: dict[str, float]) -> float:
    return clamp(mapa.get(valor.lower(), 0.0))


def buscar_condicion(
    condiciones: list[dict[str, Any]],
    beach_id: int,
    fecha: str,
    hora: str
) -> dict[str, Any] | None:
    for c in condiciones:
        if (
            c["beach_id"] == beach_id
            and c["fecha"] == fecha
            and c["hora"] == hora
        ):
            return c
    return None


def obtener_condicion_actividad(
    playa: dict[str, Any],
    actividad: str
) -> str:
    for item in playa.get("actividades_ideales", []):
        if item.get("actividad") == actividad:
            return item.get("condicion", "actividad compatible")
    return "actividad compatible"


def obtener_afinidad_estatica(
    playa: dict[str, Any],
    actividad: str
) -> float:
    """
    Afinidad estática de la playa con la actividad.
    Si la actividad está explícitamente entre las ideales, parte de una nota alta.
    Si no está, baja bastante.
    """
    actividades = playa.get("actividades_ideales", [])
    for item in actividades:
        if item.get("actividad") == actividad:
            return 9.0
    return 2.5


# =========================================================
# CONFIGURACIÓN DE PONDERACIONES
# =========================================================

# La nota final será:
# score_final = afinidad_estatica * 0.4 + score_dinamico * 0.6

PESOS_ACTIVIDAD: dict[str, dict[str, float]] = {
    "tomar_sol": {
        "temperatura_ambiente": 0.30,
        "velocidad_viento": 0.20,
        "nubosidad": 0.20,
        "probabilidad_lluvia": 0.15,
        "altura_oleaje": 0.05,
        "uv": 0.10,
    },
    "nadar": {
        "altura_oleaje": 0.30,
        "velocidad_viento": 0.20,
        "temperatura_ambiente": 0.15,
        "temperatura_agua": 0.15,
        "marea": 0.10,
        "probabilidad_lluvia": 0.10,
    },
    "surf": {
        "altura_oleaje": 0.45,
        "velocidad_viento": 0.20,
        "temperatura_ambiente": 0.05,
        "temperatura_agua": 0.05,
        "nubosidad": 0.05,
        "probabilidad_lluvia": 0.05,
        "marea": 0.15,
    },
    "windsurf": {
        "velocidad_viento": 0.50,
        "altura_oleaje": 0.20,
        "temperatura_ambiente": 0.05,
        "temperatura_agua": 0.05,
        "nubosidad": 0.05,
        "probabilidad_lluvia": 0.05,
        "marea": 0.10,
    },
    "bucear": {
        "altura_oleaje": 0.30,
        "velocidad_viento": 0.20,
        "temperatura_agua": 0.20,
        "nubosidad": 0.05,
        "probabilidad_lluvia": 0.05,
        "marea": 0.20,
    },
    "caminar": {
        "temperatura_ambiente": 0.30,
        "velocidad_viento": 0.20,
        "nubosidad": 0.20,
        "probabilidad_lluvia": 0.20,
        "uv": 0.10,
    },
}


# =========================================================
# PUNTUACIÓN DINÁMICA POR VARIABLE Y ACTIVIDAD
# =========================================================

def puntuar_temperatura_ambiente(actividad: str, valor: float) -> float:
    if actividad == "tomar_sol":
        return puntuacion_cercania(valor, ideal=26, tolerancia=12)
    if actividad == "nadar":
        return puntuacion_cercania(valor, ideal=25, tolerancia=12)
    if actividad == "surf":
        return puntuacion_cercania(valor, ideal=22, tolerancia=12)
    if actividad == "windsurf":
        return puntuacion_cercania(valor, ideal=23, tolerancia=12)
    if actividad == "bucear":
        return puntuacion_cercania(valor, ideal=24, tolerancia=12)
    if actividad == "caminar":
        return puntuacion_cercania(valor, ideal=22, tolerancia=12)
    return 5.0


def puntuar_temperatura_agua(actividad: str, valor: float) -> float:
    if actividad == "nadar":
        return puntuacion_cercania(valor, ideal=22, tolerancia=8)
    if actividad == "surf":
        return puntuacion_cercania(valor, ideal=21, tolerancia=8)
    if actividad == "windsurf":
        return puntuacion_cercania(valor, ideal=21, tolerancia=8)
    if actividad == "bucear":
        return puntuacion_cercania(valor, ideal=22, tolerancia=8)
    return 5.0


def puntuar_viento(actividad: str, valor: float) -> float:
    if actividad == "tomar_sol":
        return normalizar_inverso(valor, minimo=0, maximo=35)
    if actividad == "nadar":
        return normalizar_inverso(valor, minimo=0, maximo=30)
    if actividad == "surf":
        return puntuacion_cercania(valor, ideal=18, tolerancia=18)
    if actividad == "windsurf":
        return puntuacion_cercania(valor, ideal=30, tolerancia=20)
    if actividad == "bucear":
        return normalizar_inverso(valor, minimo=0, maximo=25)
    if actividad == "caminar":
        return puntuacion_cercania(valor, ideal=12, tolerancia=20)
    return 5.0


def puntuar_oleaje(actividad: str, valor: float) -> float:
    if actividad == "tomar_sol":
        return normalizar_inverso(valor, minimo=0, maximo=2.5)
    if actividad == "nadar":
        return normalizar_inverso(valor, minimo=0, maximo=2.0)
    if actividad == "surf":
        return puntuacion_cercania(valor, ideal=1.8, tolerancia=1.5)
    if actividad == "windsurf":
        return puntuacion_cercania(valor, ideal=1.2, tolerancia=1.2)
    if actividad == "bucear":
        return normalizar_inverso(valor, minimo=0, maximo=1.5)
    if actividad == "caminar":
        return 5.0
    return 5.0


def puntuar_nubosidad(actividad: str, valor: float) -> float:
    if actividad in {"tomar_sol", "caminar"}:
        return normalizar_inverso(valor, minimo=0, maximo=100)
    if actividad == "bucear":
        # La nubosidad importa poco, pero algo influye en percepción/visibilidad.
        return normalizar_inverso(valor, minimo=0, maximo=100)
    return 5.0


def puntuar_lluvia(actividad: str, valor: float) -> float:
    if actividad in {"tomar_sol", "nadar", "surf", "windsurf", "bucear", "caminar"}:
        return normalizar_inverso(valor, minimo=0, maximo=100)
    return 5.0


def puntuar_uv(actividad: str, valor: float) -> float:
    if actividad == "tomar_sol":
        return puntuacion_cercania(valor, ideal=7, tolerancia=5)
    if actividad == "caminar":
        return puntuacion_cercania(valor, ideal=4, tolerancia=6)
    return 5.0


def puntuar_marea(actividad: str, valor: str) -> float:
    valor = valor.lower()

    if actividad == "nadar":
        return puntuacion_categorica(valor, {
            "baja": 9.0,
            "media": 7.0,
            "alta": 5.0,
        })

    if actividad == "surf":
        return puntuacion_categorica(valor, {
            "alta": 9.0,
            "media": 7.5,
            "baja": 5.5,
        })

    if actividad == "windsurf":
        return puntuacion_categorica(valor, {
            "media": 8.5,
            "alta": 7.5,
            "baja": 6.0,
        })

    if actividad == "bucear":
        return puntuacion_categorica(valor, {
            "baja": 9.0,
            "media": 7.0,
            "alta": 4.5,
        })

    return 5.0


def puntuar_variable(actividad: str, nombre_variable: str, valor: Any) -> float:
    if nombre_variable == "temperatura_ambiente":
        return puntuar_temperatura_ambiente(actividad, float(valor))
    if nombre_variable == "temperatura_agua":
        return puntuar_temperatura_agua(actividad, float(valor))
    if nombre_variable == "velocidad_viento":
        return puntuar_viento(actividad, float(valor))
    if nombre_variable == "altura_oleaje":
        return puntuar_oleaje(actividad, float(valor))
    if nombre_variable == "nubosidad":
        return puntuar_nubosidad(actividad, float(valor))
    if nombre_variable == "probabilidad_lluvia":
        return puntuar_lluvia(actividad, float(valor))
    if nombre_variable == "uv":
        return puntuar_uv(actividad, float(valor))
    if nombre_variable == "marea":
        return puntuar_marea(actividad, str(valor))

    return 5.0


# =========================================================
# CÁLCULO DE SCORE
# =========================================================

def calcular_score_dinamico(
    actividad: str,
    condicion: dict[str, Any]
) -> tuple[float, dict[str, float]]:
    pesos = PESOS_ACTIVIDAD.get(actividad)
    if not pesos:
        raise ValueError(f"Actividad no soportada: {actividad}")

    score_total = 0.0
    desglose: dict[str, float] = {}

    for variable, peso in pesos.items():
        valor = condicion.get(variable)
        if valor is None:
            score_variable = 0.0
        else:
            score_variable = puntuar_variable(actividad, variable, valor)

        contribucion = score_variable * peso
        score_total += contribucion
        desglose[variable] = round(contribucion, 3)

    return round(score_total, 3), desglose


def calcular_score_final(
    playa: dict[str, Any],
    condicion: dict[str, Any],
    actividad: str
) -> tuple[float, dict[str, Any]]:
    afinidad_estatica = obtener_afinidad_estatica(playa, actividad)
    score_dinamico, desglose = calcular_score_dinamico(actividad, condicion)

    score_final = afinidad_estatica * 0.4 + score_dinamico * 0.6

    detalle = {
        "afinidad_estatica": round(afinidad_estatica, 3),
        "score_dinamico": round(score_dinamico, 3),
        "desglose_dinamico": desglose,
        "condicion_actividad": obtener_condicion_actividad(playa, actividad),
    }
    return round(score_final, 3), detalle


# =========================================================
# FILTROS DE RECOMENDACION
# =========================================================

def cumple_filtro_tipo(
    tipo_playa: str,
    tipo_arena: bool | None = None,
    tipo_piedra: bool | None = None,
) -> bool:
    tipo_normalizado = tipo_playa.lower()
    tipos_permitidos: set[str] = set()

    if tipo_arena:
        tipos_permitidos.add("arena")

    if tipo_piedra:
        tipos_permitidos.add("piedra")

    if not tipos_permitidos:
        return True

    return tipo_normalizado in tipos_permitidos


def playa_tiene_actividad(playa: dict[str, Any], actividad: str) -> bool:
    actividades_ideales = playa.get("actividades_ideales", [])
    return any(item.get("actividad") == actividad for item in actividades_ideales)


def playa_tiene_servicio(playa: dict[str, Any], servicio: str) -> bool:
    servicios = playa.get("servicios", {})
    return bool(servicios.get(servicio))


def cumple_filtros_estaticos_adicionales(
    playa: dict[str, Any],
    escuela_surf: bool | None = None,
    escuela_windsurf: bool | None = None,
    zona_beachvolley: bool | None = None,
    zona_deportiva: bool | None = None,
    escuela_kayak: bool | None = None,
    sitios_para_comer: bool | None = None,
    restaurantes: bool | None = None,
    comida_para_llevar: bool | None = None,
) -> bool:
    if escuela_surf and not playa_tiene_servicio(playa, "escuela_surf"):
        return False

    if escuela_windsurf and not playa_tiene_servicio(playa, "escuela_windsurf"):
        return False

    if escuela_kayak and not playa_tiene_actividad(playa, "kayak"):
        return False

    if zona_beachvolley and not playa_tiene_servicio(playa, "zona_deportiva"):
        return False

    if zona_deportiva and not playa_tiene_servicio(playa, "zona_deportiva"):
        return False

    if sitios_para_comer and not (
        playa_tiene_servicio(playa, "restaurantes")
        or playa_tiene_servicio(playa, "comida_para_llevar")
    ):
        return False

    if restaurantes and not playa_tiene_servicio(playa, "restaurantes"):
        return False

    if comida_para_llevar and not playa_tiene_servicio(playa, "comida_para_llevar"):
        return False

    return True


def cumple_filtros_dinamicos(
    condicion: dict[str, Any],
    min_temperatura_ambiente: float | None = None,
    max_temperatura_ambiente: float | None = None,
    min_nubosidad: float | None = None,
    max_nubosidad: float | None = None,
    min_velocidad_viento: float | None = None,
    max_velocidad_viento: float | None = None,
    min_altura_oleaje: float | None = None,
    max_altura_oleaje: float | None = None,
) -> bool:
    filtros = (
        ("temperatura_ambiente", min_temperatura_ambiente, max_temperatura_ambiente),
        ("nubosidad", min_nubosidad, max_nubosidad),
        ("velocidad_viento", min_velocidad_viento, max_velocidad_viento),
        ("altura_oleaje", min_altura_oleaje, max_altura_oleaje),
    )

    for variable, minimo, maximo in filtros:
        if minimo is None and maximo is None:
            continue

        valor = condicion.get(variable)
        if valor is None:
            return False

        valor_numerico = float(valor)
        if minimo is not None and valor_numerico < minimo:
            return False

        if maximo is not None and valor_numerico > maximo:
            return False

    return True


def filtrar_resultados_recomendacion(
    resultados: list[dict[str, Any]],
    tipo_arena: bool | None = None,
    tipo_piedra: bool | None = None,
    escuela_surf: bool | None = None,
    escuela_windsurf: bool | None = None,
    zona_beachvolley: bool | None = None,
    zona_deportiva: bool | None = None,
    escuela_kayak: bool | None = None,
    sitios_para_comer: bool | None = None,
    restaurantes: bool | None = None,
    comida_para_llevar: bool | None = None,
    min_temperatura_ambiente: float | None = None,
    max_temperatura_ambiente: float | None = None,
    min_nubosidad: float | None = None,
    max_nubosidad: float | None = None,
    min_velocidad_viento: float | None = None,
    max_velocidad_viento: float | None = None,
    min_altura_oleaje: float | None = None,
    max_altura_oleaje: float | None = None,
) -> list[dict[str, Any]]:
    resultados_filtrados: list[dict[str, Any]] = []

    for resultado in resultados:
        if not cumple_filtro_tipo(
            tipo_playa=str(resultado.get("tipo", "")),
            tipo_arena=tipo_arena,
            tipo_piedra=tipo_piedra,
        ):
            continue

        if not cumple_filtros_estaticos_adicionales(
            playa=resultado,
            escuela_surf=escuela_surf,
            escuela_windsurf=escuela_windsurf,
            zona_beachvolley=zona_beachvolley,
            zona_deportiva=zona_deportiva,
            escuela_kayak=escuela_kayak,
            sitios_para_comer=sitios_para_comer,
            restaurantes=restaurantes,
            comida_para_llevar=comida_para_llevar,
        ):
            continue

        if not cumple_filtros_dinamicos(
            condicion=resultado.get("condiciones", {}),
            min_temperatura_ambiente=min_temperatura_ambiente,
            max_temperatura_ambiente=max_temperatura_ambiente,
            min_nubosidad=min_nubosidad,
            max_nubosidad=max_nubosidad,
            min_velocidad_viento=min_velocidad_viento,
            max_velocidad_viento=max_velocidad_viento,
            min_altura_oleaje=min_altura_oleaje,
            max_altura_oleaje=max_altura_oleaje,
        ):
            continue

        resultados_filtrados.append(resultado)

    return resultados_filtrados


# =========================================================
# RECOMENDACIÓN PRINCIPAL
# =========================================================

def recomendar_playas(
    actividad: str,
    fecha: str,
    hora: str,
    top_n: int = 3,
    tipo_arena: bool | None = None,
    tipo_piedra: bool | None = None,
    escuela_surf: bool | None = None,
    escuela_windsurf: bool | None = None,
    zona_beachvolley: bool | None = None,
    zona_deportiva: bool | None = None,
    escuela_kayak: bool | None = None,
    sitios_para_comer: bool | None = None,
    restaurantes: bool | None = None,
    comida_para_llevar: bool | None = None,
    min_temperatura_ambiente: float | None = None,
    max_temperatura_ambiente: float | None = None,
    min_nubosidad: float | None = None,
    max_nubosidad: float | None = None,
    min_velocidad_viento: float | None = None,
    max_velocidad_viento: float | None = None,
    min_altura_oleaje: float | None = None,
    max_altura_oleaje: float | None = None,
) -> list[dict[str, Any]]:
    playas = cargar_playas()
    condiciones = cargar_condiciones_para_busqueda(playas, fecha, hora)

    resultados: list[dict[str, Any]] = []

    for playa in playas:
        condicion = buscar_condicion(
            condiciones=condiciones,
            beach_id=playa["id"],
            fecha=fecha,
            hora=hora,
        )

        if condicion is None:
            continue

        score_final, detalle = calcular_score_final(
            playa=playa,
            condicion=condicion,
            actividad=actividad,
        )

        resultados.append({
            "beach_id": playa["id"],
            "nombre": playa["nombre"],
            "ubicacion": playa["ubicacion"],
            "latitud": playa["latitud"],
            "longitud": playa["longitud"],
            "tipo": playa["tipo"],
            "descripcion": playa["descripcion"],
            "servicios": playa["servicios"],
            "actividades_ideales": playa.get("actividades_ideales", []),
            "score": score_final,
            "motivo": detalle["condicion_actividad"],
            "detalle_puntuacion": detalle,
            "condiciones": condicion,
        })

    resultados_filtrados = filtrar_resultados_recomendacion(
        resultados=resultados,
        tipo_arena=tipo_arena,
        tipo_piedra=tipo_piedra,
        escuela_surf=escuela_surf,
        escuela_windsurf=escuela_windsurf,
        zona_beachvolley=zona_beachvolley,
        zona_deportiva=zona_deportiva,
        escuela_kayak=escuela_kayak,
        sitios_para_comer=sitios_para_comer,
        restaurantes=restaurantes,
        comida_para_llevar=comida_para_llevar,
        min_temperatura_ambiente=min_temperatura_ambiente,
        max_temperatura_ambiente=max_temperatura_ambiente,
        min_nubosidad=min_nubosidad,
        max_nubosidad=max_nubosidad,
        min_velocidad_viento=min_velocidad_viento,
        max_velocidad_viento=max_velocidad_viento,
        min_altura_oleaje=min_altura_oleaje,
        max_altura_oleaje=max_altura_oleaje,
    )

    resultados_filtrados.sort(key=lambda x: x["score"], reverse=True)
    return resultados_filtrados[:top_n]


# =========================================================
# PRUEBA LOCAL
# =========================================================

if __name__ == "__main__":
    actividad = "bucear"
    fecha = "2026-04-05"
    hora = "10:00"

    top_playas = recomendar_playas(
        actividad=actividad,
        fecha=fecha,
        hora=hora,
        top_n=3,
    )

    print(f"\nTop playas para actividad='{actividad}', fecha='{fecha}', hora='{hora}':\n")
    for i, playa in enumerate(top_playas, start=1):
        print(f"{i}. {playa['nombre']} - score={playa['score']}")
        print(f"   Motivo: {playa['motivo']}")
        print(f"   Condiciones: {playa['condiciones']}")
        print()
