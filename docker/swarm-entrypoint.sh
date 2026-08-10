#!/bin/sh
set -eu

load_secret() {
  variable_name="$1"
  secret_file="$2"

  if [ -z "$secret_file" ]; then
    return
  fi
  if [ ! -r "$secret_file" ]; then
    echo "Secret file for ${variable_name} is not readable: ${secret_file}" >&2
    exit 1
  fi

  secret_value="$(cat "$secret_file")"
  if [ "$secret_value" = "__DISABLED__" ]; then
    secret_value=""
  fi
  export "${variable_name}=${secret_value}"
}

load_secret AUTH_SECRET "${AUTH_SECRET_FILE:-}"
load_secret CREEM_API_KEY "${CREEM_API_KEY_FILE:-}"
load_secret CREEM_WEBHOOK_SECRET "${CREEM_WEBHOOK_SECRET_FILE:-}"
load_secret DATABASE_URL "${DATABASE_URL_FILE:-}"
load_secret IP_ENCRYPTION_KEY "${IP_ENCRYPTION_KEY_FILE:-}"
load_secret IP_HASH_PEPPER "${IP_HASH_PEPPER_FILE:-}"
load_secret POSTGRES_PASSWORD "${POSTGRES_PASSWORD_FILE:-}"
load_secret REDIS_PASSWORD "${REDIS_PASSWORD_FILE:-}"
load_secret REDIS_URL "${REDIS_URL_FILE:-}"
load_secret REQUEST_BINDING_PEPPER "${REQUEST_BINDING_PEPPER_FILE:-}"
load_secret RETENTION_CRON_SECRET "${RETENTION_CRON_SECRET_FILE:-}"
load_secret SECRET_HASH_PEPPER "${SECRET_HASH_PEPPER_FILE:-}"
load_secret SEED_ADMIN_PASSWORD "${SEED_ADMIN_PASSWORD_FILE:-}"
load_secret SEED_DEMO_SITE_SECRET "${SEED_DEMO_SITE_SECRET_FILE:-}"
load_secret TOKEN_SIGNING_KEYS "${TOKEN_SIGNING_KEYS_FILE:-}"
load_secret TRUSTCAPTCHA_DEMO_SECRET "${TRUSTCAPTCHA_DEMO_SECRET_FILE:-}"
load_secret TRUSTCAPTCHA_SIGNUP_SECRET "${TRUSTCAPTCHA_SIGNUP_SECRET_FILE:-}"

if [ -z "${DATABASE_URL:-}" ] && [ -n "${POSTGRES_PASSWORD:-}" ]; then
  export DATABASE_URL="postgresql://${POSTGRES_USER:-trustcaptcha}:${POSTGRES_PASSWORD}@${POSTGRES_HOST:-postgres}:${POSTGRES_PORT:-5432}/${POSTGRES_DB:-trustcaptcha}"
fi

if [ -z "${REDIS_URL:-}" ] && [ -n "${REDIS_PASSWORD:-}" ]; then
  export REDIS_URL="redis://:${REDIS_PASSWORD}@${REDIS_HOST:-redis}:${REDIS_PORT:-6379}/${REDIS_DB:-0}"
fi

exec "$@"
