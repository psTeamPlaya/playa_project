from __future__ import annotations

from dataclasses import dataclass

from app.domain.models import Beach, DynamicConditions


@dataclass(frozen=True)
class ScoreBreakdown:
    activity_fit: float
    conditions_fit: float
    distance_fit: float
    static_bonus: float
    total_score: float
    reasons: list[str]


class RecommendationScorer:
    def score(
        self,
        beach: Beach,
        activity_code: str,
        conditions: DynamicConditions,
        distance_km: float,
        max_distance_km: float,
    ) -> ScoreBreakdown:
        activity_fit = beach.activity_compatibility.get(activity_code, 0.0) * 100
        conditions_fit, reasons = self._score_conditions(activity_code, beach, conditions)
        distance_fit = max(0.0, 100.0 * (1.0 - (distance_km / max_distance_km)))
        static_bonus, bonus_reasons = self._static_bonus(activity_code, beach)
        reasons.extend(bonus_reasons)
        total = (
            activity_fit * 0.40
            + conditions_fit * 0.35
            + distance_fit * 0.20
            + static_bonus * 0.05
        )
        return ScoreBreakdown(
            activity_fit=round(activity_fit, 2),
            conditions_fit=round(conditions_fit, 2),
            distance_fit=round(distance_fit, 2),
            static_bonus=round(static_bonus, 2),
            total_score=round(total, 2),
            reasons=self._compact_reasons(reasons, distance_km),
        )

    def _score_conditions(
        self,
        activity_code: str,
        beach: Beach,
        conditions: DynamicConditions,
    ) -> tuple[float, list[str]]:
        reasons: list[str] = []
        wind = self._value_or(conditions.wind_kmh, beach.default_wind_kmh)
        wave = self._value_or(conditions.wave_height_m, beach.default_wave_height_m)
        temp = self._value_or(conditions.air_temp_c, beach.default_air_temp_c)
        water = self._value_or(conditions.water_temp_c, beach.default_water_temp_c)
        rain = self._value_or(
            conditions.rain_probability_pct,
            beach.default_rain_probability_pct,
        )
        cloud = self._value_or(
            conditions.cloud_cover_pct,
            beach.default_cloud_cover_pct,
        )
        uv = self._value_or(conditions.uv_index, beach.default_uv_index)

        if activity_code == "sunbathing":
            score = (
                self._closeness(temp, 26, 7) * 0.30
                + self._inverse(rain, 40) * 0.25
                + self._inverse(cloud, 70) * 0.15
                + self._inverse(wind, 35) * 0.15
                + self._closeness(uv, 7, 4) * 0.15
            ) * 100
            if temp >= 22:
                reasons.append("temperatura agradable para tomar el sol")
            if rain <= 20:
                reasons.append("baja probabilidad de lluvia")
            if wind <= 20:
                reasons.append("viento aceptable")
            return score, reasons

        if activity_code == "surf":
            score = (
                self._closeness(wave, 1.7, 1.1) * 0.45
                + self._closeness(wind, 18, 18) * 0.30
                + self._inverse(rain, 60) * 0.10
                + self._closeness(water, 21, 6) * 0.15
            ) * 100
            if 1.0 <= wave <= 2.8:
                reasons.append("oleaje favorable para surf")
            if wind <= 30:
                reasons.append("viento compatible con la sesión")
            return score, reasons

        if activity_code == "windsurf":
            score = (
                self._closeness(wind, 28, 18) * 0.50
                + self._closeness(wave, 1.4, 1.2) * 0.25
                + self._inverse(rain, 50) * 0.10
                + self._closeness(water, 21, 6) * 0.15
            ) * 100
            if wind >= 18:
                reasons.append("viento favorable para windsurf")
            if wave <= 2.5:
                reasons.append("oleaje manejable")
            return score, reasons

        if activity_code == "diving":
            score = (
                self._inverse(wave, 2.0) * 0.35
                + self._inverse(wind, 25) * 0.25
                + self._inverse(cloud, 90) * 0.10
                + self._inverse(rain, 40) * 0.10
                + self._closeness(water, 22, 6) * 0.20
            ) * 100
            if wave <= 1.2:
                reasons.append("mar relativamente tranquila para buceo")
            if wind <= 20:
                reasons.append("viento moderado")
            return score, reasons

        if activity_code == "family_day":
            score = (
                self._inverse(wave, 1.5) * 0.30
                + self._inverse(wind, 25) * 0.25
                + self._inverse(rain, 40) * 0.20
                + self._closeness(temp, 25, 8) * 0.15
                + self._inverse(cloud, 85) * 0.10
            ) * 100
            if wave <= 1.0:
                reasons.append("condiciones suaves para ir en familia")
            if rain <= 20:
                reasons.append("riesgo bajo de lluvia")
            return score, reasons

        if activity_code == "beach_sports":
            score = (
                self._closeness(temp, 24, 8) * 0.25
                + self._inverse(wind, 30) * 0.25
                + self._inverse(rain, 35) * 0.25
                + self._inverse(cloud, 85) * 0.10
                + self._inverse(wave, 2.0) * 0.15
            ) * 100
            if wind <= 20:
                reasons.append("viento razonable para deporte en playa")
            if rain <= 20:
                reasons.append("tiempo seco")
            return score, reasons

        return 0.0, ["actividad no soportada"]

    def _static_bonus(self, activity_code: str, beach: Beach) -> tuple[float, list[str]]:
        score = 0.0
        reasons: list[str] = []

        if activity_code == "sunbathing" and beach.surface_type == "sand":
            score += 40
            reasons.append("playa de arena")
        if activity_code == "surf" and beach.has_surf_school:
            score += 35
            reasons.append("escuela de surf cercana")
        if activity_code == "windsurf" and beach.has_windsurf_school:
            score += 35
            reasons.append("escuela de windsurf cercana")
        if activity_code == "diving" and beach.access_type in {"easy", "medium"}:
            score += 25
            reasons.append("acceso razonable al baño")
        if activity_code == "family_day" and beach.family_friendly:
            score += 50
            reasons.append("orientada a un día familiar")
        if activity_code == "beach_sports" and beach.has_sports_area:
            score += 45
            reasons.append("espacio favorable para deporte")
        if beach.food_nearby:
            score += 15
            reasons.append("servicios cercanos para comer")

        return min(score, 100.0), reasons

    @staticmethod
    def _closeness(value: float, ideal: float, tolerance: float) -> float:
        if tolerance <= 0:
            return 0.0
        distance = abs(value - ideal)
        return max(0.0, 1.0 - distance / tolerance)

    @staticmethod
    def _inverse(value: float, upper_bound: float) -> float:
        if upper_bound <= 0:
            return 0.0
        return max(0.0, min(1.0, 1.0 - value / upper_bound))

    @staticmethod
    def _value_or(value: float | None, fallback: float) -> float:
        return fallback if value is None else value

    @staticmethod
    def _compact_reasons(reasons: list[str], distance_km: float) -> list[str]:
        unique: list[str] = []
        for reason in reasons:
            if reason not in unique:
                unique.append(reason)
        unique.append(f"distancia aproximada de {distance_km:.1f} km")
        return unique[:4]
