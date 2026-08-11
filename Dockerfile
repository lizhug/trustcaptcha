# syntax=docker/dockerfile:1.7
FROM node:22-bookworm-slim AS dependencies

ENV NEXT_TELEMETRY_DISABLED=1
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /workspace

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare pnpm@10.8.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY apps/demo/package.json apps/demo/package.json
COPY packages/captcha-core/package.json packages/captcha-core/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/risk-engine/package.json packages/risk-engine/package.json
COPY packages/sdk/package.json packages/sdk/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/token/package.json packages/token/package.json
RUN --mount=type=cache,id=trustcaptcha-pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile

COPY . .

FROM dependencies AS migrator
RUN pnpm --dir packages/database db:generate
CMD ["sh", "-c", "pnpm --dir packages/database exec prisma migrate deploy && pnpm --dir packages/database db:seed"]

FROM dependencies AS builder
ARG APP_NAME

ENV ACTIVE_TOKEN_SIGNING_KEY_ID=build-k1
ENV AUTH_SECRET=build-only-auth-secret-with-at-least-32-bytes
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV IP_ENCRYPTION_KEY=cs6fo9sL-XrOboakDDKdPPPZ0dWaf1-4AEifqv2-ZPo
ENV IP_HASH_PEPPER=build-ip-hash-pepper
ENV REDIS_URL=redis://127.0.0.1:6379/0
ENV REQUEST_BINDING_PEPPER=build-request-binding-pepper
ENV SECRET_HASH_PEPPER=build-secret-hash-pepper
ENV TOKEN_SIGNING_KEYS=build-k1:QDZhm7YZxxM6sJYui_B1F-Uy49BpLK0q6SToK7Pa7W8
ENV TRUSTCAPTCHA_STANDALONE=true

RUN test -n "$APP_NAME" \
  && pnpm --dir packages/database db:generate \
  && pnpm --filter @trustcaptcha/sdk build \
  && pnpm --filter "@trustcaptcha/${APP_NAME}" build

FROM node:22-bookworm-slim AS runner
ARG APP_NAME
ENV APP_NAME=$APP_NAME
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

COPY --from=builder --chown=node:node /workspace/apps/${APP_NAME}/.next/standalone ./
COPY --from=builder --chown=node:node /workspace/apps/${APP_NAME}/.next/static ./apps/${APP_NAME}/.next/static
COPY --from=builder --chown=node:node /workspace/apps/${APP_NAME}/public ./apps/${APP_NAME}/public

USER node
EXPOSE 3000
CMD ["sh", "-c", "exec node apps/${APP_NAME}/server.js"]
