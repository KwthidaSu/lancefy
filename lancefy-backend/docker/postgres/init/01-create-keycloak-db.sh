#!/bin/sh
set -eu

if [ -z "${KEYCLOAK_POSTGRES_DB:-}" ] || [ "${KEYCLOAK_POSTGRES_DB}" = "${POSTGRES_DB}" ]; then
  exit 0
fi

existing_db="$(
  psql -v ON_ERROR_STOP=1 \
    --username "$POSTGRES_USER" \
    --dbname "$POSTGRES_DB" \
    -tAc "SELECT 1 FROM pg_database WHERE datname = '${KEYCLOAK_POSTGRES_DB}'"
)"

if [ "$existing_db" = "1" ]; then
  exit 0
fi

createdb --username "$POSTGRES_USER" --owner "$POSTGRES_USER" "$KEYCLOAK_POSTGRES_DB"
