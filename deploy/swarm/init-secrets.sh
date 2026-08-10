#!/usr/bin/env sh
set -eu

secret_exists() {
  docker secret inspect "$1" >/dev/null 2>&1
}

create_secret() {
  name="$1"
  value="$2"
  if secret_exists "$name"; then
    echo "Keeping existing secret: $name"
    return
  fi
  printf '%s' "$value" | docker secret create "$name" - >/dev/null
  echo "Created secret: $name"
}

base64url_32() {
  openssl rand -base64 32 | tr '+/' '-_' | tr -d '=\n\r'
}

if ! secret_exists trustcaptcha_database_url; then
  : "${DATABASE_URL:?Set DATABASE_URL to the external PostgreSQL connection URL}"
  create_secret trustcaptcha_database_url "$DATABASE_URL"
else
  echo "Keeping existing secret: trustcaptcha_database_url"
fi

if ! secret_exists trustcaptcha_redis_url; then
  : "${REDIS_URL:?Set REDIS_URL to the external Redis connection URL}"
  create_secret trustcaptcha_redis_url "$REDIS_URL"
else
  echo "Keeping existing secret: trustcaptcha_redis_url"
fi

create_secret trustcaptcha_auth_secret "$(openssl rand -hex 32)"
create_secret trustcaptcha_secret_hash_pepper "$(openssl rand -hex 32)"
create_secret trustcaptcha_ip_hash_pepper "$(openssl rand -hex 32)"
create_secret trustcaptcha_request_binding_pepper "$(openssl rand -hex 32)"
create_secret trustcaptcha_ip_encryption_key "$(base64url_32)"
create_secret trustcaptcha_token_signing_keys "prod-k1:$(base64url_32)"
create_secret trustcaptcha_retention_cron_secret "$(openssl rand -hex 32)"
create_secret trustcaptcha_demo_site_secret "tc_sk_$(openssl rand -hex 8)_$(base64url_32)"

if ! secret_exists trustcaptcha_seed_admin_password; then
  admin_password="${SEED_ADMIN_PASSWORD:-$(openssl rand -base64 24 | tr -d '\n\r')}"
  create_secret trustcaptcha_seed_admin_password "$admin_password"
  echo "Initial admin password (save it now): $admin_password"
else
  echo "Keeping existing secret: trustcaptcha_seed_admin_password"
fi

# Replace these two secrets before enabling Creem. The entrypoint maps this
# sentinel to an empty value so billing stays safely disabled meanwhile.
create_secret trustcaptcha_creem_api_key "__DISABLED__"
create_secret trustcaptcha_creem_webhook_secret "__DISABLED__"

echo "Secrets are ready. Docker Swarm secrets cannot be read back."
