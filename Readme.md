# "Mi día de Playa" web app

Aplicación web orientada a recomendar playas según la actividad que desea realizar el usuario, teniendo en cuenta parámetros meteorológicos (dinámicos) y datos estáticos (de arena, de piedra, tiene escuelas de surf, zonas de comida, etc.), mostrando una primera selección priorizada (top-3) y permitiendo una evolución posterior hacia funcionalidades como login, favoritas, reseñas y panel de administración.

## Base técnica del proyecto para el Sprint Zero

La arquitectura elegida sigue un enfoque claro y mantenible:

- **Frontend:** HTML, CSS y JavaScript
- **Backend:** Python con FastAPI
- **Base de datos:** PostgreSQL

El frontend será servido por el propio backend, evitando introducir frameworks adicionales en esta primera fase del proyecto.

## Requisitos

- Python 3.11 o superior
- PostgreSQL en ejecución

## Instalación

### 1. Levantar la aplicación con Docker

Si prefieres ejecutar la aplicación con Docker, desde la raíz del proyecto puedes levantar los servicios definidos en `docker-compose.yaml` con:

```bash
docker compose up --build
```

La aplicación quedará expuesta en:

- `http://127.0.0.1:8000`

Para detener y eliminar los contenedores:

```bash
docker compose down
```

### 2. Levantar el backend manualmente

Si prefieres ejecutar el backend fuera de Docker, sigue estos pasos:

#### 2.1 Crear entorno virtual (recomendamos ejecutar bajo el comando 'uv')

- Abrimos un terminal en la carpeta base del proyecto y ejecutamos el siguiente comando:

```bash
python -m venv .venv
```

O:

```bash
uv venv
```

#### 2.2 Activar entorno virtual

#### Windows

```bash
.venv\Scripts\activate
```

#### Linux / macOS

```bash
source .venv/bin/activate
```

#### 2.3 Instalación de dependencias

#### Si existe el fichero **requirements.txt**, ejecutamos:

```bash
python -m pip install -r requirements.txt
```

#### O si, por el contrario, tenemos definidas las dependencias en el fichero **pyproject.toml**, podemos ejecutar, puesto que suele ser bastante más rápido:

```bash
uv sync
```

#### 2.4 Arrancar el backend

```bash
uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

## URL para comprobar que el backend está funcionando

- Salud de la API: `http://127.0.0.1:8000/api/health`

## Objetivos técnicos iniciales

En esta fase inicial del proyecto se persigue:

- Establecer una arquitectura base operativa.
- Separar claramente frontend y backend.
- Servir páginas HTML desde FastAPI.
- Disponer de recursos estáticos organizados.
- Preparar la conexión con PostgreSQL.
- Definir una base mantenible para funcionalidades futuras.

## Estructura del proyecto

```text
playa_project/
|-- backend/
|   |-- main.py
|   |-- config.py
|   |-- db.py
|   |-- engine_recomendation.py
|   |-- weather_provider.py
|   |-- routes/
|   |   |-- api.py
|   |   |-- beaches.py
|   |   |-- auth.py
|   |   `-- admin/
|   |-- models/
|   `-- schemas/
|-- frontend/
|   |-- templates/
|   |   |-- index.html
|   |   |-- login.html
|   |   `-- register.html
|   `-- static/
|       |-- css/
|       |-- js/
|       |-- img/
|       `-- locales/
|-- ai_worker/
|   |-- DockerFile.ai_worker
|   |-- image_verify.py
|   `-- requirements.txt
|-- scripts/
|   `-- generar_condiciones_playas.py
|-- artifacts/
|   |-- beach_conditions_job.log
|   `-- condiciones_playas.openmeteo.json
|-- tests/
|   |-- test_engine_recomendation.py
|   |-- test_weather_provider.py
|   `-- test_admin_catalog.py
|-- docker-compose.yaml
|-- DockerFile.main_app
|-- pyproject.toml
|-- requirements.txt
`-- README.md
```

## Organización de carpetas y ficheros

`backend/`

- Contiene la lógica principal del servidor, la configuración y las rutas del sistema.

`main.py`

- Punto de entrada de la aplicación.
- Se encarga de crear la app con FastAPI, montar recursos estáticos y conectar las rutas HTML y las rutas de API.

`db.py`

- Gestiona la base de datos.
- Proporciona el mecanismo de conexión con PostgreSQL y servirá de base para operaciones como:

  - Buscar playas.
  - Guardar playas favoritas.
  - Leer usuarios.
  - Insertar reseñas.
  - Aprobar o rechazar reseñas desde el panel de administración.
  - Comprobar que la conexión funciona.
  - Inicializar tablas.

`config.py`

- Centraliza la configuración global del proyecto, como:

  - Nombre de la aplicación.
  - Variables de entorno.
  - Conexión a base de datos.
  - Claves o parámetros sensibles.
  - Modo de ejecución.

`routes/views.py`

- Contiene las rutas que devuelven páginas HTML renderizadas.
- Ejemplos previstos:

  - `/`: página de inicio.
  - `/login`: formulario de inicio de sesión.
  - `/favoritas`: página de playas favoritas.
  - `/admin`: panel de administración.

`routes/api.py`

- Contiene las rutas que devuelven datos, inicialmente en formato JSON.
- Rutas previstas:

```text
/api/health
/api/playas
/api/playas/{id}
/api/favoritas
/api/reviews
```

- Este módulo gestiona la comunicación de datos entre frontend y backend.

`frontend/`

- Contiene los recursos de presentación de la aplicación.

`templates/index.html`

- Página principal o portada del sistema.
- Muestra el contenido específico de inicio, como por ejemplo:

  - Texto de bienvenida.
  - Explicación breve de la aplicación.
  - Formulario para elegir una actividad.
  - Botón de búsqueda.
  - Resultados iniciales.
  - Acceso a login o playas favoritas en futuras versiones.

`static/css/styles.css`

- Hoja de estilos principal del proyecto.
- Define la presentación visual de la interfaz, incluyendo tipografía, colores, espaciados, diseño responsive, tarjetas, formularios y estructura general de la web.

`static/js/main.js`

- Fichero principal de lógica del lado del navegador.
- Se encargará de aspectos interactivos como:

  - Detectar clics en botones.
  - Leer la actividad seleccionada.
  - Validar formularios.
  - Lanzar peticiones al backend.
  - Mostrar resultados sin recargar la página.
  - Abrir o cerrar menús.
  - Actualizar favoritos en pantalla.

`ai_worker/`

- Contiene el servicio auxiliar para verificación de imágenes y su Dockerfile específico.

`scripts/`

- Agrupa utilidades de mantenimiento y generación manual de datos auxiliares.

`artifacts/`

- Reúne salidas generadas y ficheros auxiliares que no forman parte del runtime principal de la aplicación.

`tests/`

- Agrupa las pruebas automáticas del backend, lógica de recomendación, integraciones y catálogo administrativo.

## Integración con Open-Meteo

La recomendación puede obtener condiciones meteorológicas y marinas en tiempo real usando Open-Meteo a partir de la latitud, longitud, fecha y hora de cada playa.

- Variables atmosféricas: `temperature_2m`, `wind_speed_10m`, `cloud_cover`, `precipitation_probability`
- Variables marinas: `wave_height`, `sea_surface_temperature`, `sea_level_height_msl`
- Si la consulta remota falla o no devuelve la hora solicitada, el backend usa como fallback `backend/condiciones_playas.json`

Configuración:

- `WEATHER_PROVIDER=openmeteo` activa la consulta remota
- `WEATHER_PROVIDER=local` fuerza el uso del JSON local
- `OPEN_METEO_TIMEZONE=Atlantic/Canary` controla la zona horaria enviada a Open-Meteo
- `OPEN_METEO_TIMEOUT_SECONDS=10` ajusta el timeout HTTP
