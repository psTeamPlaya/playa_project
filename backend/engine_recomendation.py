from __future__ import annotations

import json
from pathlib import Path
from typing import Any

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
    return cargar_json(PLAYAS_FILE)


def cargar_condiciones() -> list[dict[str, Any]]:
    return cargar_json(CONDICIONES_FILE)


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
    playa_id: int,
    fecha: str,
    hora: str
) -> dict[str, Any] | None:
    for c in condiciones:
        if (
            c["playa_id"] == playa_id
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
    "snorkel": {
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
    if actividad == "snorkel":
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
    if actividad == "snorkel":
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
    if actividad == "snorkel":
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
    if actividad == "snorkel":
        return normalizar_inverso(valor, minimo=0, maximo=1.5)
    if actividad == "caminar":
        return 5.0
    return 5.0


def puntuar_nubosidad(actividad: str, valor: float) -> float:
    if actividad in {"tomar_sol", "caminar"}:
        return normalizar_inverso(valor, minimo=0, maximo=100)
    if actividad == "snorkel":
        # La nubosidad importa poco, pero algo influye en percepción/visibilidad.
        return normalizar_inverso(valor, minimo=0, maximo=100)
    return 5.0


def puntuar_lluvia(actividad: str, valor: float) -> float:
    if actividad in {"tomar_sol", "nadar", "surf", "windsurf", "snorkel", "caminar"}:
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

    if actividad == "snorkel":
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
# RECOMENDACIÓN PRINCIPAL
# =========================================================

def recomendar_playas(
    actividad: str,
    fecha: str,
    hora: str,
    top_n: int = 3
) -> list[dict[str, Any]]:
    playas = cargar_playas()
    condiciones = cargar_condiciones()

    resultados: list[dict[str, Any]] = []

    for playa in playas:
        condicion = buscar_condicion(
            condiciones=condiciones,
            playa_id=playa["id"],
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
            "playa_id": playa["id"],
            "nombre": playa["nombre"],
            "ubicacion": playa["ubicacion"],
            "latitud": playa["latitud"],
            "longitud": playa["longitud"],
            "tipo": playa["tipo"],
            "descripcion": playa["descripcion"],
            "servicios": playa["servicios"],
            "score": score_final,
            "motivo": detalle["condicion_actividad"],
            "detalle_puntuacion": detalle,
            "condiciones": condicion,
        })

    resultados.sort(key=lambda x: x["score"], reverse=True)
    return resultados[:top_n]


# =========================================================
# PRUEBA LOCAL
# =========================================================

if __name__ == "__main__":
    actividad = "snorkel"
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