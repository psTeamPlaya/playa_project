# Mi Playita para HOY

Aplicación web orientada a recomendar playas según la actividad que desea realizar el usuario teniendo en cuenta parámetros meteorológicos (dinámicos) y datos estáticos (de arena, de pieda, tiene escuelas de surf, zonas de comida, etc), mostrando una primera selección priorizada (top-3) y permitiendo una evolución posterior hacia funcionalidades como login, favoritas, reseñas y panel de administración.

Base técnica del proyecto para el Sprint Zero.


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
```bash
python -m venv .venv
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

### 3. Instalar dependencias
```bash
pip install -r requirements.txt
```

### 4. Crear archivo `.env`
Copiar `.env.example` a `.env` y ajustar valores.

### 5. Ejecutar la aplicación
```bash
uvicorn app.main:app --reload
```

## URLs de prueba
- Inicio: `http://127.0.0.1:8000/`
- Salud de la API: `http://127.0.0.1:8000/api/health`
- Comprobación de BD: `http://127.0.0.1:8000/api/db-check`


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
mi-playita-hoy/
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
│     │  ├─ base.html
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

    * /    → página de inicio;
    * /login → formulario de inicio de sesión;
    * /favoritas → página de playas favoritas;
    * /admin → panel de administración.

```routes/api.py```

- Contiene las rutas que devuelven datos, inicialmente en formato JSON.
-Ejemplos previstos:
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

```templates/base.html```

- Plantilla base común para todas las páginas HTML.
- Incluye la estructura general compartida de la web:

```
<!DOCTYPE html>
estructura <html>
metadatos
enlace a hojas de estilo
cabecera
navegación
pie de página
carga de scripts JavaScript
```

```templates/index.html```

- Página principal o portada del sistema.
- Hereda de base.html y muestra el contenido específico de inicio, como por ejemplo:

    * texto de bienvenida;
    * explicación breve de la aplicación;
    * formulario para elegir una actividad;
    * botón de búsqueda;
    * resultados iniciales;
    * acceso a login o favoritas.

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
