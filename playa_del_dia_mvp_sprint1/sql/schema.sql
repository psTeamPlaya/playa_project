CREATE TABLE IF NOT EXISTS activities (
    code TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    icon_path TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS beaches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    municipality TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    surface_type TEXT NOT NULL,
    family_friendly INTEGER NOT NULL,
    pet_friendly INTEGER NOT NULL,
    food_nearby INTEGER NOT NULL,
    has_surf_school INTEGER NOT NULL,
    has_windsurf_school INTEGER NOT NULL,
    has_sports_area INTEGER NOT NULL,
    access_type TEXT NOT NULL,
    default_air_temp_c REAL NOT NULL,
    default_water_temp_c REAL NOT NULL,
    default_wave_height_m REAL NOT NULL,
    default_wind_kmh REAL NOT NULL,
    default_cloud_cover_pct REAL NOT NULL,
    default_rain_probability_pct REAL NOT NULL,
    default_uv_index REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS beach_activities (
    beach_id INTEGER NOT NULL,
    activity_code TEXT NOT NULL,
    compatibility REAL NOT NULL,
    PRIMARY KEY (beach_id, activity_code),
    FOREIGN KEY (beach_id) REFERENCES beaches(id),
    FOREIGN KEY (activity_code) REFERENCES activities(code)
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS favorites (
    user_id INTEGER NOT NULL,
    beach_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, beach_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (beach_id) REFERENCES beaches(id)
);
