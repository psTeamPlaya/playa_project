from app.domain.geo import haversine_km


def test_haversine_returns_zero_for_same_point() -> None:
    assert haversine_km(28.1, -15.4, 28.1, -15.4) == 0


def test_haversine_is_positive_for_different_points() -> None:
    distance = haversine_km(28.1417, -15.43, 27.7394, -15.5845)
    assert distance > 0
    assert round(distance, 1) > 40
