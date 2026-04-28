from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import text

ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.db import engine


def fetch_rows(table_name: str) -> list[dict]:
    with engine.connect() as conn:
        result = conn.execute(text(f"SELECT * FROM {table_name} ORDER BY id"))
        return [dict(row) for row in result.mappings()]


def print_table(title: str, rows: list[dict]) -> None:
    print(f"\n=== {title} ===")

    if not rows:
        print("Sin registros.")
        return

    headers = list(rows[0].keys())
    widths = {
        header: max(len(header), *(len(str(row.get(header, ""))) for row in rows))
        for header in headers
    }

    header_line = " | ".join(header.ljust(widths[header]) for header in headers)
    separator = "-+-".join("-" * widths[header] for header in headers)

    print(header_line)
    print(separator)

    for row in rows:
        print(" | ".join(str(row.get(header, "")).ljust(widths[header]) for header in headers))


def main() -> None:
    users = fetch_rows("users")
    beaches = fetch_rows("beaches")

    print_table("Tabla users", users)
    print_table("Tabla playas (beaches)", beaches)


if __name__ == "__main__":
    main()
