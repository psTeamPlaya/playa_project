"""
Pruebas de integración para la comunicación con la base de datos.

Se usa una base de datos SQLite en memoria para aislar los tests y no depender
de la base de datos de producción, garantizando reproducibilidad y rapidez.
"""

import pytest
from decimal import Decimal
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from backend.db import Base, check_database_connection
from backend.models.beach import Beach
from backend.models.service import Service


# ─── Fixtures ───────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def engine_test():
    """Motor SQLite en memoria para los tests de integración."""
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session(engine_test):
    """Sesión de base de datos aislada por test con rollback automático."""
    connection = engine_test.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection, autocommit=False, autoflush=False)
    session = Session()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def playa_canteras(db_session):
    """Playa de ejemplo persistida en la sesión de test."""
    playa = Beach(
        name="Las Canteras",
        location="Las Palmas de Gran Canaria",
        description="Playa urbana en el norte de Gran Canaria",
        type="arena",
        latitude=Decimal("28.1416"),
        longitude=Decimal("-15.4328"),
        accessibility="alta",
        image="canteras.jpg",
    )
    db_session.add(playa)
    db_session.flush()
    return playa


# ─── Tests: conexión básica ──────────────────────────────────────────────────

class TestConexionBaseDeDatos:
    """Verifica que la capa de base de datos responde correctamente."""

    def test_check_database_connection_devuelve_true_con_bd_disponible(
        self, engine_test, monkeypatch
    ):
        """check_database_connection debe retornar True cuando la BD responde."""
        import backend.db as db_module

        monkeypatch.setattr(db_module, "engine", engine_test)
        assert check_database_connection() is True

    def test_check_database_connection_devuelve_false_con_bd_caida(self, monkeypatch):
        """check_database_connection debe retornar False si no puede conectar."""
        broken_engine = create_engine(
            "postgresql://nouser:nopass@localhost:1/nodb",
            connect_args={"connect_timeout": 1},
        )
        import backend.db as db_module

        monkeypatch.setattr(db_module, "engine", broken_engine)
        assert check_database_connection() is False


# ─── Tests: CRUD de playas ───────────────────────────────────────────────────

class TestCRUDPlayas:
    """Tests de integración sobre el modelo Beach contra SQLite."""

    def test_insertar_playa_persiste_en_base_de_datos(self, db_session):
        playa = Beach(
            name="Maspalomas",
            location="San Bartolomé de Tirajana",
            type="arena",
            latitude=Decimal("27.7373"),
            longitude=Decimal("-15.5862"),
        )
        db_session.add(playa)
        db_session.flush()

        recuperada = db_session.query(Beach).filter_by(name="Maspalomas").first()
        assert recuperada is not None
        assert recuperada.location == "San Bartolomé de Tirajana"

    def test_actualizar_playa_modifica_campo_en_base_de_datos(self, db_session, playa_canteras):
        playa_canteras.description = "Descripción actualizada"
        db_session.flush()

        recuperada = db_session.query(Beach).filter_by(id=playa_canteras.id).first()
        assert recuperada.description == "Descripción actualizada"

    def test_eliminar_playa_la_borra_de_base_de_datos(self, db_session, playa_canteras):
        playa_id = playa_canteras.id
        db_session.delete(playa_canteras)
        db_session.flush()

        recuperada = db_session.query(Beach).filter_by(id=playa_id).first()
        assert recuperada is None

    def test_consultar_playas_devuelve_lista(self, db_session, playa_canteras):
        playas = db_session.query(Beach).all()
        assert len(playas) >= 1
        nombres = [p.name for p in playas]
        assert "Las Canteras" in nombres

    def test_insertar_playa_con_coordenadas_decimales(self, db_session):
        playa = Beach(
            name="Playa del Inglés",
            location="Maspalomas",
            type="arena",
            latitude=Decimal("27.7461"),
            longitude=Decimal("-15.5741"),
        )
        db_session.add(playa)
        db_session.flush()

        recuperada = db_session.query(Beach).filter_by(name="Playa del Inglés").first()
        assert float(recuperada.latitude) == pytest.approx(27.7461, abs=0.001)
        assert float(recuperada.longitude) == pytest.approx(-15.5741, abs=0.001)

    def test_playa_sin_tipo_se_persiste_con_tipo_nulo(self, db_session):
        playa = Beach(
            name="Playa sin tipo",
            latitude=Decimal("28.0"),
            longitude=Decimal("-15.5"),
        )
        db_session.add(playa)
        db_session.flush()

        recuperada = db_session.query(Beach).filter_by(name="Playa sin tipo").first()
        assert recuperada.type is None

    def test_multiples_playas_se_insertan_y_recuperan_correctamente(self, db_session):
        nombres = ["Playa A", "Playa B", "Playa C"]
        for i, nombre in enumerate(nombres):
            db_session.add(Beach(
                name=nombre,
                latitude=Decimal(f"28.{i}"),
                longitude=Decimal("-15.0"),
            ))
        db_session.flush()

        playas = db_session.query(Beach).filter(Beach.name.in_(nombres)).all()
        assert len(playas) == 3

    def test_filtrar_playas_por_tipo(self, db_session):
        db_session.add(Beach(name="Arena 1", type="arena", latitude=Decimal("28.0"), longitude=Decimal("-15.0")))
        db_session.add(Beach(name="Roca 1", type="roca", latitude=Decimal("28.1"), longitude=Decimal("-15.1")))
        db_session.flush()

        playas_arena = db_session.query(Beach).filter_by(type="arena").all()
        assert all(p.type == "arena" for p in playas_arena)

    def test_rollback_no_persiste_cambios(self, engine_test):
        """Verifica que el rollback limpia los datos correctamente."""
        Session = sessionmaker(bind=engine_test)
        session = Session()
        session.add(Beach(
            name="Playa Efímera",
            latitude=Decimal("28.0"),
            longitude=Decimal("-15.0"),
        ))
        session.flush()
        session.rollback()
        session.close()

        verify_session = Session()
        encontrada = verify_session.query(Beach).filter_by(name="Playa Efímera").first()
        verify_session.close()
        assert encontrada is None


# ─── Tests: raw SQL ─────────────────────────────────────────────────────────

class TestRawSQL:
    """Verifica que es posible ejecutar SQL directo contra la BD."""

    def test_select_1_funciona(self, engine_test):
        with engine_test.connect() as conn:
            result = conn.execute(text("SELECT 1")).scalar()
        assert result == 1

    def test_tabla_beaches_existe(self, engine_test):
        with engine_test.connect() as conn:
            # SQLite usa sqlite_master; la consulta debe ejecutarse sin error
            result = conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='beaches'")
            ).fetchone()
        assert result is not None