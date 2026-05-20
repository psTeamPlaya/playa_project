import os

from dotenv import load_dotenv

try:
    from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
except ModuleNotFoundError:  # pragma: no cover - optional in local/test envs
    FastMail = MessageSchema = ConnectionConfig = MessageType = None


load_dotenv()

conf = None
if ConnectionConfig is not None:
    conf = ConnectionConfig(
        MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
        MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
        MAIL_FROM=os.getenv("MAIL_USERNAME"),
        MAIL_PORT=587,
        MAIL_SERVER="smtp.gmail.com",
        MAIL_STARTTLS=True,
        MAIL_SSL_TLS=False,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True,
    )


async def _send_message(subject: str, recipients: list[str], body: str) -> None:
    if not all([FastMail, MessageSchema, MessageType, conf]):
        return

    message = MessageSchema(
        subject=subject,
        recipients=recipients,
        body=body,
        subtype=MessageType.html,
    )
    fm = FastMail(conf)
    await fm.send_message(message)


async def send_welcome_email(email: str) -> None:
    try:
        await _send_message(
            subject="¡Bienvenido a \"Mi día de Playa\"",
            recipients=[email],
            body=f"Hola {email}, gracias por registrarte. ¡Disfruta de tus actividades!",
        )
        print(f" Correo enviado a {email}")
    except Exception as exc:  # pragma: no cover - network/mail provider failures
        print(f" Error enviando correo: {exc}")


async def send_alert_email(
    *,
    email: str,
    activity_label: str,
    location_label: str | None,
    beach_name: str,
    match_datetime,
) -> None:
    location_text = location_label or "tu zona configurada"
    match_date = match_datetime.strftime("%d/%m/%Y")
    match_time = match_datetime.strftime("%H:%M")
    body = (
        f"Hola {email},<br><br>"
        f"Tu alerta para <strong>{activity_label}</strong> tiene una coincidencia prevista "
        f"el <strong>{match_date}</strong> a las <strong>{match_time}</strong> "
        f"en <strong>{beach_name}</strong> ({location_text})."
    )

    try:
        await _send_message(
            subject=f"Alerta de Mi día de Playa: {activity_label}",
            recipients=[email],
            body=body,
        )
        print(f" Correo de alerta enviado a {email}")
    except Exception as exc:  # pragma: no cover - network/mail provider failures
        print(f" Error enviando correo de alerta: {exc}")
