from app.projects.constants import (
    JOB_DRAFT,
    JOB_OPEN,
    JOB_ACTIVE,
    JOB_COMPLETE,
    ASSIGNMENT_ACTIVE,
)


def has_offer(job) -> bool:
    return len(job.offers) > 0


def has_active_assignment(job) -> bool:
    return any(a.status == ASSIGNMENT_ACTIVE for a in job.assignments)


def can_edit(job) -> bool:
    if job.status == JOB_DRAFT:
        return True
    if job.status == JOB_OPEN and not has_offer(job):
        return True
    return False


def can_delete(job) -> bool:
    if job.status in {JOB_DRAFT, JOB_OPEN}:
        return True
    return False


def can_accept_offer(job) -> bool:
    return job.status == JOB_OPEN and not has_active_assignment(job)


def can_cancel_contract(job) -> bool:
    return job.status == JOB_ACTIVE and has_active_assignment(job)


def can_close_job(job) -> bool:
    return job.status == JOB_ACTIVE and has_active_assignment(job)


def is_readonly(job) -> bool:
    return job.status == JOB_COMPLETE
