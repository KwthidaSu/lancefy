from enum import Enum


class ProjectStatus(str, Enum):
    draft = "draft"
    open = "open"
    active = "active"
    closed = "closed"
