from __future__ import annotations

from collections import Counter

from app.domain.geo import haversine_km
from app.domain.models import (
    Beach,
    DynamicConditions,
    EvaluationTrace,
    RecommendationRequest,
    RecommendationResult,
)
from app.domain.scoring import RecommendationScorer


class RecommendationService:
    def __init__(self, beach_repository, weather_provider) -> None:
        self.beach_repository = beach_repository
        self.weather_provider = weather_provider
        self.scorer = RecommendationScorer()

    async def recommend_top_three(self, request: RecommendationRequest) -> dict:
        beaches = self.beach_repository.list_beaches()
        traces: list[EvaluationTrace] = []
        candidates: list[tuple[Beach, DynamicConditions, float, list[str], float]] = []

        for beach in beaches:
            distance_km = haversine_km(
                request.user_location.latitude,
                request.user_location.longitude,
                beach.latitude,
                beach.longitude,
            )
            compatibility = beach.activity_compatibility.get(request.activity_code, 0.0)
            if distance_km > request.max_distance_km:
                traces.append(
                    EvaluationTrace(
                        beach_id=beach.id,
                        distance_km=round(distance_km, 2),
                        discarded=True,
                        discard_reason="distance",
                        activity_fit=compatibility * 100,
                        conditions_fit=0.0,
                        distance_fit=0.0,
                        static_bonus=0.0,
                        total_score=0.0,
                    )
                )
                continue
            if compatibility <= 0.0:
                traces.append(
                    EvaluationTrace(
                        beach_id=beach.id,
                        distance_km=round(distance_km, 2),
                        discarded=True,
                        discard_reason="activity",
                        activity_fit=0.0,
                        conditions_fit=0.0,
                        distance_fit=0.0,
                        static_bonus=0.0,
                        total_score=0.0,
                    )
                )
                continue

            conditions = await self.weather_provider.fetch_conditions(
                beach=beach,
                selected_date=request.selected_date,
                selected_hour=request.selected_hour,
            )
            breakdown = self.scorer.score(
                beach=beach,
                activity_code=request.activity_code,
                conditions=conditions,
                distance_km=distance_km,
                max_distance_km=request.max_distance_km,
            )
            traces.append(
                EvaluationTrace(
                    beach_id=beach.id,
                    distance_km=round(distance_km, 2),
                    discarded=False,
                    discard_reason=None,
                    activity_fit=breakdown.activity_fit,
                    conditions_fit=breakdown.conditions_fit,
                    distance_fit=breakdown.distance_fit,
                    static_bonus=breakdown.static_bonus,
                    total_score=breakdown.total_score,
                )
            )
            candidates.append(
                (beach, conditions, round(distance_km, 2), breakdown.reasons, breakdown.total_score)
            )

        ordered = sorted(candidates, key=lambda item: item[4], reverse=True)
        top = ordered[:3]
        results = [
            RecommendationResult(
                rank=index + 1,
                beach_id=beach.id,
                beach_name=beach.name,
                municipality=beach.municipality,
                score=score,
                distance_km=distance_km,
                explanation=reasons,
                static_features={
                    "surface_type": beach.surface_type,
                    "family_friendly": beach.family_friendly,
                    "food_nearby": beach.food_nearby,
                    "access_type": beach.access_type,
                },
                dynamic_conditions=conditions,
            )
            for index, (beach, conditions, distance_km, reasons, score) in enumerate(top)
        ]

        discards = Counter(trace.discard_reason for trace in traces if trace.discarded)
        return {
            "results": results,
            "evaluated_count": len(beaches),
            "discarded_summary": {
                "discarded_by_distance": discards.get("distance", 0),
                "discarded_by_activity": discards.get("activity", 0),
            },
            "explanation_if_empty": self._empty_explanation(request.activity_code, traces, len(results)),
            "trace": traces,
        }

    @staticmethod
    def _empty_explanation(activity_code: str, traces: list[EvaluationTrace], result_count: int) -> str | None:
        if result_count >= 3:
            return None
        discarded_by_distance = sum(1 for trace in traces if trace.discard_reason == "distance")
        if result_count == 0:
            return (
                f"No hay playas válidas para la actividad '{activity_code}' con los filtros actuales. "
                f"Se descartaron {discarded_by_distance} por distancia u otros criterios básicos."
            )
        return (
            f"Solo hay {result_count} resultados válidos con los filtros actuales. "
            "Se muestran las mejores alternativas disponibles."
        )
