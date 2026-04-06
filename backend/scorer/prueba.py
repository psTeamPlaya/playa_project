import json, pathlib
from backend.scorer.main_scorer import score_beach

BASE_DIR = pathlib.Path(__file__).resolve().parent.parent.parent
data = json.loads((BASE_DIR / "backend" / "beaches.json").read_text())

actividad = "surf"
print(f"\n=== Ranking para: {actividad} ===")

scored = []
for playa in data["data"]:
    s = score_beach(playa, actividad)
    scored.append((playa["static"]["name"], s))

scored.sort(key=lambda x: x[1], reverse=True)
for nombre, score in scored:
    estado = "EXCLUIDA" if score == -1 else f"{score}/100"
    print(f"  {nombre:<30} {estado}")