from sqlalchemy import String

from backend.models.beach import Beach


def test_beach_accessibility_is_string_column():
    assert isinstance(Beach.__table__.c.accessibility.type, String)
