from sqlalchemy.orm import Session

from backend.models.user import User
from backend.models.user_audit_log import UserAuditLog


USER_AUDIT_REGISTER = "register"
USER_AUDIT_BAN = "ban"
USER_AUDIT_UNBAN = "unban"
USER_AUDIT_DELETE = "delete"


def create_user_audit_log(
    db: Session,
    action: str,
    *,
    target_user: User | None = None,
    target_email: str | None = None,
    actor_user: User | None = None,
) -> UserAuditLog:
    resolved_target_email = target_email or getattr(target_user, "email", None)
    if not resolved_target_email:
        raise ValueError("target_email is required to create a user audit log")

    log = UserAuditLog(
        action=action,
        target_user_id=getattr(target_user, "id", None),
        target_email=resolved_target_email,
        actor_user_id=getattr(actor_user, "id", None),
        actor_email=getattr(actor_user, "email", None),
    )
    db.add(log)
    return log
