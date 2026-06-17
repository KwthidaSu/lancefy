#!/bin/bash
set -euo pipefail

KC_SERVER_URL="${KC_SERVER_URL:-http://127.0.0.1:8080}"
KC_REALM="${KEYCLOAK_REALM:-app}"
GOOGLE_ALIAS="${KEYCLOAK_GOOGLE_ALIAS:-google}"
GOOGLE_ENABLED="${KEYCLOAK_GOOGLE_ENABLED:-false}"
GOOGLE_CLIENT_ID="${KEYCLOAK_GOOGLE_CLIENT_ID:-}"
GOOGLE_CLIENT_SECRET="${KEYCLOAK_GOOGLE_CLIENT_SECRET:-}"

/opt/keycloak/bin/kc.sh start-dev --import-realm &
KC_PID=$!

cleanup() {
  if kill -0 "${KC_PID}" >/dev/null 2>&1; then
    kill "${KC_PID}" >/dev/null 2>&1 || true
    wait "${KC_PID}" || true
  fi
}

trap cleanup INT TERM

wait_for_keycloak() {
  until /opt/keycloak/bin/kcadm.sh config credentials \
    --server "${KC_SERVER_URL}" \
    --realm master \
    --user "${KEYCLOAK_ADMIN:-admin}" \
    --password "${KEYCLOAK_ADMIN_PASSWORD:-admin}" \
    >/dev/null 2>&1; do
    sleep 2
  done
}

wait_for_realm() {
  until /opt/keycloak/bin/kcadm.sh get "realms/${KC_REALM}" >/dev/null 2>&1; do
    sleep 2
  done
}

provider_exists() {
  /opt/keycloak/bin/kcadm.sh get "identity-provider/instances/${GOOGLE_ALIAS}" -r "${KC_REALM}" >/dev/null 2>&1
}

create_google_provider() {
  /opt/keycloak/bin/kcadm.sh create identity-provider/instances -r "${KC_REALM}" \
    -s alias="${GOOGLE_ALIAS}" \
    -s providerId=google \
    -s enabled=true \
    -s authenticateByDefault=false \
    -s trustEmail=true \
    -s storeToken=false \
    -s addReadTokenRoleOnCreate=false \
    -s firstBrokerLoginFlowAlias="first broker login" \
    -s displayName="Google" \
    -s 'config.clientId='"${GOOGLE_CLIENT_ID}" \
    -s 'config.clientSecret='"${GOOGLE_CLIENT_SECRET}" \
    -s 'config.defaultScope=openid profile email' \
    -s 'config.prompt=select_account' \
    -s 'config.useJwksUrl=true' \
    >/dev/null
}

update_google_provider() {
  /opt/keycloak/bin/kcadm.sh update "identity-provider/instances/${GOOGLE_ALIAS}" -r "${KC_REALM}" \
    -s alias="${GOOGLE_ALIAS}" \
    -s providerId=google \
    -s enabled=true \
    -s authenticateByDefault=false \
    -s trustEmail=true \
    -s storeToken=false \
    -s addReadTokenRoleOnCreate=false \
    -s firstBrokerLoginFlowAlias="first broker login" \
    -s displayName="Google" \
    -s 'config.clientId='"${GOOGLE_CLIENT_ID}" \
    -s 'config.clientSecret='"${GOOGLE_CLIENT_SECRET}" \
    -s 'config.defaultScope=openid profile email' \
    -s 'config.prompt=select_account' \
    -s 'config.useJwksUrl=true' \
    >/dev/null
}

disable_google_provider() {
  if provider_exists; then
    /opt/keycloak/bin/kcadm.sh update "identity-provider/instances/${GOOGLE_ALIAS}" -r "${KC_REALM}" \
      -s enabled=false \
      >/dev/null
  fi
}

wait_for_keycloak
wait_for_realm

if [[ "${GOOGLE_ENABLED}" == "true" && -n "${GOOGLE_CLIENT_ID}" && -n "${GOOGLE_CLIENT_SECRET}" ]]; then
  if provider_exists; then
    update_google_provider
  else
    create_google_provider
  fi
  echo "Google SSO configured for realm '${KC_REALM}'."
  echo "Google redirect URI: ${KC_SERVER_URL/127.0.0.1/localhost}/realms/${KC_REALM}/broker/${GOOGLE_ALIAS}/endpoint"
else
  disable_google_provider
  echo "Google SSO skipped. Set KEYCLOAK_GOOGLE_ENABLED=true with KEYCLOAK_GOOGLE_CLIENT_ID and KEYCLOAK_GOOGLE_CLIENT_SECRET to enable it."
fi

wait "${KC_PID}"
