import requests
from app.core.config import settings


def get_admin_token() -> str:
    data = {
        "client_id": settings.KEYCLOAK_CLIENT_ID,
        "client_secret": settings.KEYCLOAK_CLIENT_SECRET,
        "grant_type": "client_credentials",
    }

    response = requests.post(
        f"{settings.KEYCLOAK_URL}/realms/{settings.KEYCLOAK_REALM}/protocol/openid-connect/token",
        data=data,
        timeout=15,
    )

    if not response.ok:
        raise Exception(
            f"Failed to get admin token: {response.status_code} {response.text}"
        )

    return response.json()["access_token"]


def _get_headers() -> dict:
    token = get_admin_token()
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


def create_user_in_keycloak(
    email: str,
    *,
    email_verified: bool = False,
    enabled: bool = True,
    required_actions: list[str] | None = None,
) -> str:
    headers = _get_headers()

    payload = {
        "username": email,
        "email": email,
        "enabled": enabled,
        "emailVerified": email_verified,
        "requiredActions": required_actions or [],
    }

    response = requests.post(
        f"{settings.KEYCLOAK_URL}/admin/realms/{settings.KEYCLOAK_REALM}/users",
        headers=headers,
        json=payload,
        timeout=15,
    )

    if response.status_code != 201:
        raise Exception(
            f"Failed to create user in Keycloak: {response.status_code} {response.text}"
        )

    user_id = response.headers["Location"].split("/")[-1]
    return user_id


def list_realm_roles() -> list[dict]:
    headers = _get_headers()

    response = requests.get(
        f"{settings.KEYCLOAK_URL}/admin/realms/{settings.KEYCLOAK_REALM}/roles",
        headers=headers,
        timeout=15,
    )

    if not response.ok:
        raise Exception(
            f"Failed to list realm roles: {response.status_code} {response.text}"
        )

    return response.json()


def get_realm_role(role_name: str) -> dict:
    headers = _get_headers()

    response = requests.get(
        f"{settings.KEYCLOAK_URL}/admin/realms/{settings.KEYCLOAK_REALM}/roles/{role_name}",
        headers=headers,
        timeout=15,
    )

    if not response.ok:
        raise Exception(
            f"Failed to get role '{role_name}': {response.status_code} {response.text}"
        )

    return response.json()


def assign_realm_role_to_user(user_id: str, role_name: str) -> None:
    headers = _get_headers()
    role_data = get_realm_role(role_name)

    payload = [
        {
            "id": role_data["id"],
            "name": role_data["name"],
        }
    ]

    response = requests.post(
        f"{settings.KEYCLOAK_URL}/admin/realms/{settings.KEYCLOAK_REALM}/users/{user_id}/role-mappings/realm",
        headers=headers,
        json=payload,
        timeout=15,
    )

    if not response.ok:
        raise Exception(
            "Failed to assign realm role "
            f"'{role_name}' to user '{user_id}': "
            f"{response.status_code} {response.text}"
        )


def assign_freelancer_role(user_id: str) -> None:
    assign_realm_role_to_user(user_id, "freelancer")


def get_user_realm_roles(user_id: str) -> list[str]:
    headers = _get_headers()

    response = requests.get(
        f"{settings.KEYCLOAK_URL}/admin/realms/{settings.KEYCLOAK_REALM}/users/{user_id}/role-mappings/realm",
        headers=headers,
        timeout=15,
    )

    if not response.ok:
        raise Exception(
            "Failed to fetch realm roles "
            f"for user '{user_id}': {response.status_code} {response.text}"
        )

    return [role["name"] for role in response.json()]


def remove_realm_roles_from_user(
    user_id: str,
    role_names: list[str],
) -> None:
    if not role_names:
        return

    headers = _get_headers()
    payload = []

    for role_name in role_names:
        role_data = get_realm_role(role_name)
        payload.append(
            {
                "id": role_data["id"],
                "name": role_data["name"],
            }
        )

    response = requests.delete(
        f"{settings.KEYCLOAK_URL}/admin/realms/{settings.KEYCLOAK_REALM}/users/{user_id}/role-mappings/realm",
        headers=headers,
        json=payload,
        timeout=15,
    )

    if not response.ok:
        raise Exception(
            "Failed to remove realm roles "
            f"from user '{user_id}': {response.status_code} {response.text}"
        )


def sync_user_realm_role(
    user_id: str,
    role_name: str,
    *,
    replaceable_roles: list[str] | None = None,
) -> None:
    replaceable_roles = replaceable_roles or []
    current_roles = get_user_realm_roles(user_id)
    roles_to_remove = [
        current_role
        for current_role in current_roles
        if current_role in replaceable_roles and current_role != role_name
    ]
    remove_realm_roles_from_user(user_id, roles_to_remove)
    if role_name not in current_roles:
        assign_realm_role_to_user(user_id, role_name)


def update_user_in_keycloak(user_id: str, payload: dict) -> None:
    headers = _get_headers()

    response = requests.put(
        f"{settings.KEYCLOAK_URL}/admin/realms/{settings.KEYCLOAK_REALM}/users/{user_id}",
        headers=headers,
        json=payload,
        timeout=15,
    )

    if not response.ok:
        raise Exception(
            "Failed to update user in Keycloak "
            f"'{user_id}': {response.status_code} {response.text}"
        )


def set_user_enabled(user_id: str, enabled: bool) -> None:
    update_user_in_keycloak(user_id, {"enabled": enabled})


def set_user_password(
    user_id: str,
    password: str,
    *,
    temporary: bool = False,
) -> None:
    headers = _get_headers()

    response = requests.put(
        f"{settings.KEYCLOAK_URL}/admin/realms/{settings.KEYCLOAK_REALM}/users/{user_id}/reset-password",
        headers=headers,
        json={
            "type": "password",
            "temporary": temporary,
            "value": password,
        },
        timeout=15,
    )

    if not response.ok:
        raise Exception(
            "Failed to set password in Keycloak "
            f"for user '{user_id}': {response.status_code} {response.text}"
        )


def send_set_password_email(user_id: str) -> None:
    send_user_actions_email(user_id, ["UPDATE_PASSWORD"])


def send_user_actions_email(
    user_id: str,
    actions: list[str],
    *,
    client_id: str | None = None,
    redirect_uri: str | None = None,
    lifespan: int | None = None,
) -> None:
    if not actions:
        raise ValueError("At least one Keycloak action is required")

    headers = _get_headers()
    params: dict[str, str | int] = {}

    if client_id:
        params["client_id"] = client_id
    if redirect_uri:
        params["redirect_uri"] = redirect_uri
    if lifespan is not None:
        params["lifespan"] = lifespan

    response = requests.put(
        f"{settings.KEYCLOAK_URL}/admin/realms/{settings.KEYCLOAK_REALM}/users/{user_id}/execute-actions-email",
        headers=headers,
        params=params or None,
        json=actions,
        timeout=15,
    )

    if not response.ok:
        raise Exception(
            "Failed to send Keycloak action email: "
            f"{response.status_code} {response.text}"
        )
