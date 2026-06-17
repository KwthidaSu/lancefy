from fastapi import FastAPI

from app.audit.router import router as audit_router
from app.auth.routes import router as auth_router
from app.chat.routes import router as chat_router
from app.community.router import router as community_router
from app.core.health import router as health_router
from app.core.http import register_http_features
from app.disputes.routes import router as disputes_router
from app.files.router import router as files_router
from app.jobs.router import router as jobs_router
from app.kyc.routes import router as kyc_router
from app.notifications.routes import router as notifications_router
from app.payments.router import router as payments_router
from app.portfolio.routes import router as portfolio_router
from app.projects.router import router as projects_router
from app.reviews.routes import router as reviews_router
from app.skills.router import router as skills_router
from app.users.router import router as users_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="LanceFy Backend",
        root_path="/api",
        docs_url="/docs",
        openapi_url="/openapi.json",
    )

    register_http_features(app)

    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(chat_router)
    app.include_router(projects_router)
    app.include_router(notifications_router)
    app.include_router(reviews_router)
    app.include_router(disputes_router)
    app.include_router(portfolio_router)
    app.include_router(users_router)
    app.include_router(kyc_router)
    app.include_router(community_router)
    app.include_router(skills_router)
    app.include_router(files_router)
    app.include_router(jobs_router)
    app.include_router(payments_router)
    app.include_router(audit_router)
    return app


app = create_app()
