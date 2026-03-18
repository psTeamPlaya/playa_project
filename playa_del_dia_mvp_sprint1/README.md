# La Playa del Día — MVP Sprint 1

MVP funcional del Sprint 1 para **La Playa del Día**.

Incluye:

- selección de actividad, fecha, hora y ubicación
- geolocalización desde navegador o introducción manual
- filtro por distancia máxima
- top-3 de playas de Gran Canaria con explicación
- integración aislada con Open-Meteo
- degradación controlada si falla el proveedor externo
- tests unitarios e integración base
- workflow de GitHub Actions para CI mínima

## Alcance real del MVP

Este MVP cubre las historias del **Sprint 1** del ERS:

- HU-01, HU-02, HU-03, HU-04, HU-05, HU-06, HU-07
- HT-01, HT-02, HT-03, HT-04, HT-05, HT-06, HT-07

No incluye todavía:

- login
- favoritos
- reportes temporales
- filtros avanzados ambientales
- ficha detallada completa
- chatbot

## Stack

- Python 3.11+
- FastAPI
- sqlite3 para desarrollo local del MVP
- Open-Meteo como proveedor externo
- HTML/CSS/JS servidos por FastAPI

> Nota: para producción, la base principal debería migrarse a PostgreSQL/PostGIS.
> Firebase queda preparado conceptualmente para Sprint 2, pero no se usa aún porque login y favoritos no entran en Sprint 1.

## Arranque rápido

### 1. Crear entorno virtual

```bash
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# o en Windows PowerShell:
# .venv\Scripts\Activate.ps1
```

### 2. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 3. Lanzar la app

```bash
uvicorn app.main:app --reload
```

Abrir:

```text
http://127.0.0.1:8000
```

## Ejecutar tests

```bash
pytest
```

## Estructura

```text
app/
  domain/              # reglas de negocio puras
  infrastructure/      # sqlite, seeds y Open-Meteo
  presentation/        # esquemas y frontend estático
  main.py
sql/
  schema.sql
tests/
.github/workflows/
```

## Variables de entorno opcionales

Copiar `.env.example` si quieres personalizar:

- `PLAYA_DB_PATH`
- `OPEN_METEO_TIMEOUT_SECONDS`
- `APP_ENV`

## Endpoints principales

- `GET /health`
- `GET /api/v1/activities`
- `GET /api/v1/beaches`
- `POST /api/v1/recommendations/top`

## Observación importante

La integración con Open-Meteo intenta obtener:

- temperatura ambiente
- probabilidad de precipitación
- nubosidad
- viento
- UV
- altura de ola
- temperatura superficial del mar

Si el proveedor falla, el sistema usa valores de respaldo por playa para no colapsar el ranking.
