from pydantic import ConfigDict, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str

    KEYCLOAK_URL: str
    KEYCLOAK_REALM: str
    KEYCLOAK_ISSUER_URL: str | None = None

    KEYCLOAK_CLIENT_ID: str
    KEYCLOAK_CLIENT_SECRET: str
    KEYCLOAK_VERIFY_AUDIENCE: bool = False
    KEYCLOAK_ALLOWED_AUDIENCES: str | None = None
    KEYCLOAK_ALLOWED_AZP: str | None = None
    KEYCLOAK_ACTION_EMAIL_CLIENT_ID: str | None = None
    KEYCLOAK_ACTION_EMAIL_REDIRECT_URI: str | None = None

    MINIO_ENDPOINT: str
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str
    MINIO_BUCKET: str
    MINIO_PUBLIC_URL: str
    FRONTEND_URL: str = "http://localhost:5173"
    INVITATION_EXPIRY_HOURS: int = 72

    # SLA (Service Level Agreement)
    # Job
    SLA_JOB_DEFAULT_EXPIRY_DAYS: int = 30

    # Milestone / Payment
    SLA_MILESTONE_FUNDING_DAYS: int = 3
    SLA_CLIENT_REVIEW_DAYS: int = 3
    SLA_PROJECT_AUTO_COMPLETE_DAYS: int = 3

    # Review
    SLA_REVIEW_WINDOW_DAYS: int = 14

    # Dispute
    SLA_DISPUTE_BUFFER_DAYS: int = 1

    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_USE_TLS: bool = True
    SMTP_USE_SSL: bool = False
    EMAIL_FROM: str | None = None
    EMAIL_FROM_NAME: str | None = None

    OMISE_PUBLIC_KEY: str | None = None
    OMISE_SECRET_KEY: str | None = None
    OMISE_API_BASE: str = "https://api.omise.co"
    OMISE_LIVEMODE: bool = False

    @field_validator(
        "KEYCLOAK_URL",
        "KEYCLOAK_ISSUER_URL",
        "KEYCLOAK_ALLOWED_AUDIENCES",
        "KEYCLOAK_ALLOWED_AZP",
        "MINIO_ENDPOINT",
        "MINIO_PUBLIC_URL",
        "FRONTEND_URL",
        "OMISE_API_BASE",
        mode="before",
    )
    @classmethod
    def strip_string_values(cls, value: str | None):
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("INVITATION_EXPIRY_HOURS", mode="after")
    @classmethod
    def validate_invitation_expiry_hours(cls, value: int):
        if value <= 0:
            raise ValueError("INVITATION_EXPIRY_HOURS must be greater than 0")
        return value

    model_config = ConfigDict(
        env_file=".env",
        extra="ignore",
    )


settings = Settings()
