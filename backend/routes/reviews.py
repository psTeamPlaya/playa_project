import redis
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.db import get_db
from backend.models.review import Review
from backend.schemas.review import ReviewCreate, ReviewUpdate, ReviewOut
from backend.auth.auth import get_current_user
from backend.models.user import User

router = APIRouter(prefix="/reviews", tags=["Reviews"])

r_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

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

@router.post("/{review_id}/report")
async def report_review(
    review_id: int,
    reason: str,
    db: Session = Depends(get_db)
):
    review = db.query(Review).join(User, Review.user_id == User.id).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
        
    r_client.sadd("reported_reviews", review_id)
    
    report_key = f"report:{review_id}"
    r_client.hset(report_key, mapping={
        "id": str(review.id),
        "email": review.user.email,
        "rating": str(review.rating),
        "content": review.content or "",
        "reason": reason
    })

    r_client.expire(report_key, 2592000)
    
    return {"message": "Review reported successfully"}

