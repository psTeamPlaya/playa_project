from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.models.variable import Variable
from backend.schemas.variable import VariableResponse

router = APIRouter(prefix="/api/variables", tags=["Variables"])

@router.get("", response_model=list[VariableResponse])
def get_variables(db: Session = Depends(get_db)):
    return db.query(Variable).all()