#!/usr/bin/env sh
set -eu

: "${IMAGE_PREFIX:?Set IMAGE_PREFIX to a registry repository prefix}"
: "${IMAGE_TAG:?Set IMAGE_TAG to an immutable release tag}"
: "${DEMO_SITE_KEY:?Set DEMO_SITE_KEY}"

docker buildx build --platform linux/amd64 --target migrator \
  --tag "${IMAGE_PREFIX}/migrate:${IMAGE_TAG}" --push .

docker buildx build --platform linux/amd64 --target runner \
  --build-arg APP_NAME=api \
  --tag "${IMAGE_PREFIX}/api:${IMAGE_TAG}" --push .

docker buildx build --platform linux/amd64 --target runner \
  --build-arg APP_NAME=dashboard \
  --build-arg NEXT_PUBLIC_API_URL=https://api.trustcaptcha.xuandev.com \
  --build-arg NEXT_PUBLIC_DASHBOARD_URL=https://app.trustcaptcha.xuandev.com \
  --build-arg NEXT_PUBLIC_SIGNUP_SITE_KEY="${DEMO_SITE_KEY}" \
  --tag "${IMAGE_PREFIX}/dashboard:${IMAGE_TAG}" --push .

docker buildx build --platform linux/amd64 --target runner \
  --build-arg APP_NAME=demo \
  --build-arg NEXT_PUBLIC_API_URL=https://api.trustcaptcha.xuandev.com \
  --build-arg NEXT_PUBLIC_DASHBOARD_URL=https://app.trustcaptcha.xuandev.com \
  --build-arg NEXT_PUBLIC_DEMO_SITE_KEY="${DEMO_SITE_KEY}" \
  --build-arg NEXT_PUBLIC_SITE_URL=https://trustcaptcha.xuandev.com \
  --tag "${IMAGE_PREFIX}/demo:${IMAGE_TAG}" --push .
