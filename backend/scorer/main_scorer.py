from general_scorers import clamp
from config_scorer import EXCLUSION_RULES, ACTIVITY_MAP, AVAILABLE_ACTIVITIES

def score_beach(beach: dict, activity: str) -> float:
    if activity not in ACTIVITY_MAP:
        raise ValueError(f"Activity '{activity}' not supported. Options: {AVAILABLE_ACTIVITIES}")

    dynamic_data = beach.get("dynamic", {})

    is_excluded = EXCLUSION_RULES.get(activity)
    if is_excluded and is_excluded(dynamic_data):
        return -1.0

    scorer_function = ACTIVITY_MAP[activity]
    raw_score = scorer_function(dynamic_data)

    return round(clamp(raw_score, 0, 100), 1)


if __name__ == "__main__":
    test_beach = {
        "name": "Playa Paradiso",
        "dynamic": {
            "airTemperature": 28,
            "seaTemperature": 21,
            "wind": 10,
            "rain": 0,
            "rainProbability": 0.05,
            "uvRadiation": 6,
            "cloudiness": 0.1,
            "haze": 0,
            "waves": {"height": 1.5, "period": 8}
        }
    }

    print(f"Score for Surf: {score_beach(test_beach, 'surf')}")
    print(f"Score for Sunbathing: {score_beach(test_beach, 'sunbathing')}")