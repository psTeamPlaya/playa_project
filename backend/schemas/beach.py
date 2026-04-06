from pydantic import BaseModel

class Coordinates(BaseModel):
    latitude: float
    longitude: float

class StaticBeach(BaseModel):
    id: int
    name: str
    coordinates: Coordinates
    municipality: str
    surface: str

class Waves(BaseModel):
    height: float
    period: float

class DynamicBeach(BaseModel):
    airTemperature: float
    seaTemperature: float
    wind: float
    waves: Waves
    rain: float
    rainProbability: float
    uvRadiation: float
    haze: float
    tide: float
    cloudiness: float

class Beach(BaseModel):
    static: StaticBeach
    dynamic: DynamicBeach