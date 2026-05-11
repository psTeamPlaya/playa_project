from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.db import get_db
from backend.models.review import Review
from backend.schemas.review import ReviewCreate, ReviewUpdate, ReviewOut
from backend.auth.auth import get_current_user
from backend.models.user import User

router = APIRouter(prefix="/reviews", tags=["Reviews"])

@router.post("/", response_model=ReviewOut)
def create_review(
    review: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_review = Review(
        user_id=current_user.id,   # sale del token, no del frontend
        beach_id=review.beach_id,
        rating=review.rating,
        content=review.content
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    return new_review

@router.get("/beach/{beach_id}", response_model=list[ReviewOut])
def get_reviews_by_beach(beach_id: int, db: Session = Depends(get_db)):
    reviews = (
        db.query(Review)
        .filter(Review.beach_id == beach_id)
        .order_by(Review.id.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "email": r.user.email,
            "beach_id": r.beach_id,
            "rating": r.rating,
            "content": r.content,
        }
        for r in reviews
    ]

@router.get("/beach/{beach_id}/rating")
def get_beach_rating(beach_id: int, db: Session = Depends(get_db)):
    avg, count = db.query(
        func.avg(Review.rating),
        func.count(Review.rating)
    ).filter(Review.beach_id == beach_id).first()

    return {
        "beach_id": beach_id,
        "avg_rating": float(avg) if avg else None,
        "reviews_count": count
    }


@router.put("/{review_id}", response_model=ReviewOut)
def update_review(
    review_id: int,
    data: ReviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    # Solo el dueño puede editar
    if review.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(review, key, value)

    db.commit()
    db.refresh(review)
    return review


@router.delete("/{review_id}")
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    # Solo puede eliminar dueño o admin
    if review.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not allowed")

    db.delete(review)
    db.commit()
    return {"message": "Review deleted"}