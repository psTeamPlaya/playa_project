def clamp(value: float, min_val: float, max_val: float) -> float:
    return max(min_val, min(max_val, value))

def score_temperature(air: float, sea: float, air_ideal: float, sea_ideal: float) -> float:
    air_score = max(0, 1 - abs(air - air_ideal) / 10)
    sea_score = max(0, 1 - abs(sea - sea_ideal) / 8)
    return (air_score * 0.6 + sea_score * 0.4) * 100

def score_wind(wind: float, ideal_min: float, ideal_max: float, max_tolerable: float) -> float:
    if wind > max_tolerable:
        return 0
    if ideal_min <= wind <= ideal_max:
        return 100
    if wind < ideal_min:
        return max(0, 100 - (ideal_min - wind) * 5)
    return max(0, 100 - (wind - ideal_max) * 6)

def score_swell(height: float, period: float, h_min: float, h_max: float, p_min: float) -> float:
    if height < h_min or height > h_max:
        dist = min(abs(height - h_min), abs(height - h_max))
        h_score = max(0, 100 - dist * 60)
    else:
        h_score = 100
    p_score = clamp((period - p_min) / 5 * 100, 0, 100)
    return h_score * 0.7 + p_score * 0.3

def score_general_conditions(rain: float, rain_prob: float, uv: float, cloudiness: float, haze: float) -> float:
    rain_score = 100 if rain == 0 and rain_prob < 0.15 else max(0, 100 - rain_prob * 200)
    uv_score   = clamp(uv / 8 * 100, 0, 100)
    cloud_score = max(0, 100 - cloudiness * 100)
    haze_score  = 100 if haze == 0 else 50
    return rain_score * 0.4 + uv_score * 0.2 + cloud_score * 0.2 + haze_score * 0.2