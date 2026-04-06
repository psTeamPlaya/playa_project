from backend.scorer.general_scorers import score_temperature, score_wind, score_swell, score_general_conditions

def calculate_sunbathing(d: dict) -> float:
    t = score_temperature(d["airTemperature"], d["seaTemperature"], 26, 22)
    w = score_wind(d["wind"], 0, 15, 30)
    c = score_general_conditions(d["rain"], d["rainProbability"], d["uvRadiation"], d["cloudiness"], d["haze"])
    return t * 0.3 + w * 0.2 + c * 0.5

def calculate_surf(d: dict) -> float:
    s = score_swell(d["waves"]["height"], d["waves"]["period"], 0.8, 2.5, 7)
    w = score_wind(d["wind"], 10, 25, 40)
    t = score_temperature(d["airTemperature"], d["seaTemperature"], 22, 18)
    return s * 0.55 + w * 0.3 + t * 0.15

def calculate_windsurf(d: dict) -> float:
    w = score_wind(d["wind"], 15, 30, 40)
    s = score_swell(d["waves"]["height"], d["waves"]["period"], 0.3, 1.5, 5)
    t = score_temperature(d["airTemperature"], d["seaTemperature"], 22, 18)
    return w * 0.6 + s * 0.25 + t * 0.15

def calculate_paddle_surf(d: dict) -> float:
    s = score_swell(d["waves"]["height"], d["waves"]["period"], 0.0, 0.8, 4)
    w = score_wind(d["wind"], 0, 12, 20)
    t = score_temperature(d["airTemperature"], d["seaTemperature"], 24, 20)
    return s * 0.5 + w * 0.35 + t * 0.15

def calculate_kayak(d: dict) -> float:
    s = score_swell(d["waves"]["height"], d["waves"]["period"], 0.0, 0.8, 4)
    w = score_wind(d["wind"], 0, 15, 25)
    t = score_temperature(d["airTemperature"], d["seaTemperature"], 23, 19)
    return s * 0.45 + w * 0.4 + t * 0.15

def calculate_family(d: dict) -> float:
    s = score_swell(d["waves"]["height"], d["waves"]["period"], 0.0, 0.8, 4)
    t = score_temperature(d["airTemperature"], d["seaTemperature"], 25, 21)
    w = score_wind(d["wind"], 0, 15, 30)
    c = score_general_conditions(d["rain"], d["rainProbability"], d["uvRadiation"], d["cloudiness"], d["haze"])
    return s * 0.35 + t * 0.3 + w * 0.2 + c * 0.15