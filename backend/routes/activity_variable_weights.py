from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.models.activity_variable_weight import ActivityVariableWeight
from backend.schemas.activity_variable_weight import ActivityVariableWeightResponse

router = APIRouter(prefix="/activity-variable-weights", tags=["Activity Variable Weights"])

@router.get("/activity/{activity_id}", response_model=list[ActivityVariableWeightResponse])
def get_activity_weights(activity_id: int, db: Session = Depends(get_db)):
    return db.query(ActivityVariableWeight).filter(
        ActivityVariableWeight.activity_id == activity_id
    ).all()