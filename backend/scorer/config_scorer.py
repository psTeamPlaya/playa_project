import specific_scorers

EXCLUSION_RULES = {
    "sunbathing":  lambda d: d["rain"] > 0.3 or d["rainProbability"] > 0.5 or d["cloudiness"] > 0.8,
    "surf":         lambda d: d["waves"]["height"] < 0.4 or d["waves"]["height"] > 3.5 or d["wind"] > 50,
    "windsurf":     lambda d: d["wind"] < 8 or d["wind"] > 40 or d["rain"] > 0.5,
    "paddle_surf":  lambda d: d["waves"]["height"] > 1.2 or d["wind"] > 20,
    "kayak":        lambda d: d["waves"]["height"] > 1.0 or d["wind"] > 25,
    "family":       lambda d: d["waves"]["height"] > 1.2 or d["rain"] > 0.3 or d["wind"] > 30,
}

ACTIVITY_MAP = {
    "sunbathing":  specific_scorers.calculate_sunbathing,
    "surf":        specific_scorers.calculate_surf,
    "windsurf":    specific_scorers.calculate_windsurf,
    "paddle_surf": specific_scorers.calculate_paddle_surf,
    "kayak":       specific_scorers.calculate_kayak,
    "family":      specific_scorers.calculate_family,
}

AVAILABLE_ACTIVITIES = list(ACTIVITY_MAP.keys())