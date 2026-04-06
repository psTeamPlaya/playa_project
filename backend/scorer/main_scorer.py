from backend.scorer.general_scorers import clamp
from backend.scorer.config_scorer import EXCLUSION_RULES, ACTIVITY_MAP, AVAILABLE_ACTIVITIES

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