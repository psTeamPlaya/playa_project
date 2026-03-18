"""Preparado para Sprint 2.

Firebase no se usa todavía en el MVP del Sprint 1 porque el alcance actual no incluye:
- autenticación
- favoritos por usuario
- persistencia de preferencias

Este módulo sirve como punto de entrada para incorporar Firebase Auth o Storage sin
acoplar la lógica de dominio al proveedor.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class FirebaseConfig:
    project_id: str | None = None
    credentials_path: str | None = None


class FirebaseGateway:
    def __init__(self, config: FirebaseConfig | None = None) -> None:
        self.config = config or FirebaseConfig()

    def is_configured(self) -> bool:
        return bool(self.config.project_id and self.config.credentials_path)
