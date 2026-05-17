from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List, Dict, Any
from backend.db import get_db
from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from backend.models.review import Review
from backend.models.beach import Beach
from backend.models.user import User

router = APIRouter(prefix="/reviews", tags=["Admin Reviews"])

@router.get("")  # Obsłuży: /api/admin/reviews
async def get_reviews_for_admin(
    limit: int = 20,
    offset: int = 0,
    snapshot_id: Optional[int] = None,
    db: Session = Depends(get_db),
):  
    
    query = db.query(Review).join(User, Review.user_id == User.id)
    
    if snapshot_id:
        query = query.filter(Review.id > snapshot_id)
        
    reviews = query.order_by(Review.id.desc()).offset(offset).limit(limit).all()
    
    current_snapshot = snapshot_id
    if not current_snapshot and reviews:
        current_snapshot = reviews[0].id

    return {
        "data": [
            {
                "id": r.id,
                "email": r.user.email,
                "rating": r.rating,
                "content": r.content,
            }
            for r in reviews
        ],
        "snapshot_id": current_snapshot
    }


@router.delete("/{review_id}") 
async def delete_review(
    review_id: int,
    db: Session = Depends(get_db),    
):
    deleted_rows = db.query(Review).filter(Review.id == review_id).delete()
    if not deleted_rows:
        raise HTTPException(status_code=404, detail="Review not found")
    db.commit()
    return {"message": "Review deleted by admin"}


@router.get("/statistics")
async def get_reviews_statistics(db: Session = Depends(get_db)):
    total_reviews = db.query(func.count(Review.id)).scalar() or 0

    global_avg = db.query(func.avg(Review.rating)).scalar()
    global_avg = round(float(global_avg), 2) if global_avg else 0.0


    rating_counts = db.query(Review.rating, func.count(Review.id)).group_by(Review.rating).all()
    
    distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for rating, count in rating_counts:
        if rating in distribution:
            distribution[rating] = count

    top_beaches_query = (
        db.query(
            Beach.id,
            Beach.name,
            func.count(Review.id).label("reviews_count"),
            func.avg(Review.rating).label("average_rating")
        )
        .join(Review, Review.beach_id == Beach.id)
        .group_by(Beach.id)
        .order_by(func.count(Review.id).desc())
        .limit(5)
        .all()
    )

    popular_beaches = [
        {
            "id": beach.id,
            "name": beach.name,
            "reviews_count": beach.reviews_count,
            "average_rating": round(float(beach.average_rating), 2) if beach.average_rating else 0.0
        }
        for beach in top_beaches_query
    ]
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_reviews = db.query(func.count(Review.id)).filter(Review.created_at >= seven_days_ago).scalar() or 0

    return {
        "summary": {
            "total_reviews": total_reviews,
            "global_average_rating": global_avg,
            "reviews_last_7_days": recent_reviews
        },
        "rating_distribution": distribution,
        "popular_beaches": popular_beaches
    }

@router.get("/reported")
async def get_reviews_reported(
    db: Session = Depends(get_db),
):
    return None