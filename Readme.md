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


## Estructura del proyecto

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
