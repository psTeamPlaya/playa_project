# "Mi día de Playa" web app

Aplicación web orientada a recomendar playas según la actividad que desea realizar el usuario teniendo en cuenta parámetros meteorológicos (dinámicos) y datos estáticos (de arena, de pieda, tiene escuelas de surf, zonas de comida, etc), mostrando una primera selección priorizada (top-3) y permitiendo una evolución posterior hacia funcionalidades como login, favoritas, reseñas y panel de administración.

## Base técnica del proyecto para el Sprint Zero.


La arquitectura elegida sigue un enfoque claro y mantenible:

- **Frontend:** HTML, CSS y JavaScript
- **Backend:** Python con FastAPI
- **Base de datos:** PostgreSQL

El frontend será servido por el propio backend, evitando introducir frameworks adicionales en esta primera fase del proyecto.

## Requisitos
- Python 3.11 o superior
- PostgreSQL en ejecución

## Instalación

### 1. Crear entorno virtual
- Abrimos un terminal en la carpeta base del proyecto, y ejecutamos el siguiente comando:

```bash
python -m venv .venv
```
o
```
uv venv
```

### 2. Activar entorno virtual

#### Windows
```bash
.venv\Scripts\activate
```

#### Linux / macOS
```bash
source .venv/bin/activate
```


### 2.1 Instalación de dependencias

#### Si existe el fichero **requirements.txt**, ejecutamos:
```bash
python -m pip install -r requirements.txt
```

#### o si, por el contrario, tenemos definidas las dependencias en el fichero **pyproject.toml**, podemos ejecutar, puesto que suele ser bastante más rápido:
```
uv sync
```

### 3. Para levantar el backend

```bash
uvicorn backend.main:app --reload
```
## URL para comprobar que el backend está funcionando
- Salud de la API: `http://127.0.0.1:8000/api/health`


## Objetivos técnicos iniciales

En esta fase inicial del proyecto se persigue:

- establecer una arquitectura base operativa;
- separar claramente frontend y backend;
- servir páginas HTML desde FastAPI;
- disponer de recursos estáticos organizados;
- preparar la conexión con PostgreSQL;
- definir una base mantenible para funcionalidades futuras.


# Estructura del proyecto

```text
playa_project/
├─ app/
│  ├─ backend/
│  │  ├─ main.py
│  │  ├─ db.py
│  │  ├─ config.py
│  │  └─ routes/
│  │     ├─ views.py
│  │     └─ api.py
│  └─ frontend/
│     ├─ templates/
│     │  └─ index.html
│     └─ static/
│        ├─ css/
│        │  └─ styles.css
│        └─ js/
│           └─ main.js
├─ requirements.txt
├─ .gitignore
└─ README.md
```
## Organización de carpetas y ficheros
```app/backend/```

- Contiene la lógica principal del servidor, la configuración y las rutas del sistema.

```main.py```

- Punto de entrada de la aplicación.
- Se encarga de crear la app con FastAPI, montar recursos estáticos y conectar las rutas HTML y las rutas de API.

```db.py```

- Gestiona la base de datos.
- Proporciona el mecanismo de conexión con PostgreSQL y servirá de base para operaciones como:

    * buscar playas;
    * guardar favoritas;
    * leer usuarios;
    * insertar reseñas;
    * aprobar o rechazar reseñas desde el panel de administración;
    * comprobar que la conexión funciona;
    * inicializar tablas.

```config.py```

- Centraliza la configuración global del proyecto, como:

    * nombre de la aplicación;
    * variables de entorno;
    * conexión a base de datos;
    * claves o parámetros sensibles;
    * modo de ejecución.

```routes/views.py```

- Contiene las rutas que devuelven páginas HTML renderizadas.
- Ejemplos previstos:

    * /             → página de inicio;
    * /login        → formulario de inicio de sesión;
    * /favoritas    → página de playas favoritas;
    * /admin        → panel de administración.

```routes/api.py```

- Contiene las rutas que devuelven datos, inicialmente en formato JSON.
- Rutas previstas:
```
    /api/health
    /api/playas
    /api/playas/{id}
    /api/favoritas
    /api/reviews
```

- Este módulo gestiona la comunicación de datos entre frontend y backend.

```app/frontend/```

- Contiene los recursos de presentación de la aplicación.


```templates/index.html```

- Página principal o portada del sistema.
- Muestra el contenido específico de inicio, como por ejemplo:

    * texto de bienvenida;
    * explicación breve de la aplicación;
    * formulario para elegir una actividad;
    * botón de búsqueda;
    * resultados iniciales;
    * acceso a login o playas favoritas (en futuras versiones)

```static/css/styles.css```

- Hoja de estilos principal del proyecto.
- Define la presentación visual de la interfaz, incluyendo tipografía, colores, espaciados, diseño responsive, tarjetas, formularios y estructura general de la web.

```static/js/main.js```

- Fichero principal de lógica del lado del navegador.
- Se encargará de aspectos interactivos como:

    * detectar clics en botones;
    * leer la actividad seleccionada;
    * validar formularios;
    * lanzar peticiones al backend;
    * mostrar resultados sin recargar la página;
    * abrir o cerrar menús;
    * actualizar favoritos en pantalla.

## IntegraciÃ³n con Open-Meteo

La recomendaciÃ³n puede obtener condiciones meteorolÃ³gicas y marinas en tiempo real usando Open-Meteo a partir de la latitud, longitud, fecha y hora de cada playa.

- Variables atmosfÃ©ricas: `temperature_2m`, `wind_speed_10m`, `cloud_cover`, `precipitation_probability`
- Variables marinas: `wave_height`, `sea_surface_temperature`, `sea_level_height_msl`
- Si la consulta remota falla o no devuelve la hora solicitada, el backend usa como fallback `backend/condiciones_playas.json`

ConfiguraciÃ³n:

- `WEATHER_PROVIDER=openmeteo` activa la consulta remota
- `WEATHER_PROVIDER=local` fuerza el uso del JSON local
- `OPEN_METEO_TIMEZONE=Atlantic/Canary` controla la zona horaria enviada a Open-Meteo
- `OPEN_METEO_TIMEOUT_SECONDS=10` ajusta el timeout HTTP
