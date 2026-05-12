from sqlalchemy import Column, DateTime, Integer, String, func

from backend.db import Base


class UserAuditLog(Base):
    __tablename__ = "user_audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    action = Column(String, nullable=False)
    target_user_id = Column(Integer, nullable=True)
    target_email = Column(String, nullable=False)
    actor_user_id = Column(Integer, nullable=True)
    actor_email = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
