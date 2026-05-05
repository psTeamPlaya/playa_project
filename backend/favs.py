from backend.engine_recomendation import cargar_condiciones
from backend.seed_beaches import cargar_playas


def getFavouriteBeaches(beachesIds, fecha=None, hora=None):
    playas = cargar_playas()
    if fecha and hora:
        condiciones = cargar_condiciones(playas, fecha, hora)
        # print("Condiciones cargadas para fecha y hora:", fecha, hora, "; condiciones: ", condiciones)
        # create a lookup dictionary: {beach_id: condition_data}
        condiciones_dict = {cond['beach_id']: cond for cond in condiciones}

    resultados = []
    for playa in playas:
        if playa["id"] not in beachesIds:
            continue
        cond = condiciones_dict.get(playa["id"]) if fecha and hora else None
        resultados.append({
            "beach_id": playa["id"],
            "nombre": playa["nombre"],
            "ubicacion": playa["ubicacion"],
            "descripcion": playa["descripcion"],
            "tipo": playa["tipo"],
            "condiciones": cond,
            "servicios": playa["servicios"],
            "isFavorite": True
        })

    return resultados
