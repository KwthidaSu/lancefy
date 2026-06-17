from celery import Celery
from celery.schedules import crontab

celery_app = Celery(
    "backend",
    broker="redis://backend-redis:6379/0",
    backend="redis://backend-redis:6379/1",
)

celery_app.autodiscover_tasks(["app.tasks"])

celery_app.conf.beat_schedule = {
    "check-auto-release-every-hour": {
        "task": "app.tasks.auto_release.check_auto_release",
        "schedule": crontab(minute=0),   # every hour at :00
    },
    "check-auto-complete-every-hour": {
        "task": "app.tasks.auto_complete.check_auto_complete",
        "schedule": crontab(minute=10),  # every hour at :10
    },
    "check-auto-close-deals-every-hour": {
        "task": "app.tasks.auto_close_deals.check_auto_close_deals",
        "schedule": crontab(minute=20),  # every hour at :20
    },
    "check-auto-cancel-unfunded-every-hour": {
        "task": "app.tasks.auto_cancel_unfunded.check_auto_cancel_unfunded",
        "schedule": crontab(minute=30),  # every hour at :30
    },
}
