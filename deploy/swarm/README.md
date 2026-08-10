# TrustCaptcha Docker Swarm deployment

This deployment uses stack name `trustcaptcha` and three HTTPS origins:

- `https://trustcaptcha.xuandev.com` — localized marketing site and live demo
- `https://app.trustcaptcha.xuandev.com` — customer dashboard
- `https://api.trustcaptcha.xuandev.com` — public verification API

The application services publish no host ports. Caddy reaches them through a
shared encrypted overlay network. PostgreSQL and Redis are external managed
services and are not created by this stack.

## 1. DNS and prerequisites

Create `A`/`AAAA` records for the base, `app`, and `api` hostnames pointing to
the node where Caddy publishes ports 80 and 443. The Swarm must already be
initialized, and the deployment machine needs Docker, OpenSSL, registry
credentials, and network access to the external PostgreSQL and Redis endpoints.
All runtime secrets are supplied through the private Stack environment.

Create or reuse an attachable overlay network for Caddy:

```sh
docker network create --driver overlay --attachable caddy
```

If it already exists, Docker will report that and no change is needed. Ensure
the running Caddy service is connected to this network. For example:

```sh
docker service update --network-add caddy YOUR_CADDY_SERVICE
```

Only run the update when `docker service inspect YOUR_CADDY_SERVICE` confirms
that the network is not already attached.

## 2. Production variables

Copy the example outside the repository or to an ignored local file, then edit
the registry, immutable release tag, administrator email, and Creem product IDs:

```sh
cp deploy/swarm/swarm.env.example deploy/swarm/swarm.env
set -a
. deploy/swarm/swarm.env
set +a
```

`docker stack deploy` does not support Compose's `--env-file`, so export these
variables in the shell before every deploy.

## 3. Publish immutable images with CI

Push a `staging-*` or `v*` Git tag. Gitea Actions builds and publishes the four
images; production images also receive the `prod` channel tag. Do not build
images on the Swarm server.

```sh
git tag v1.0.0
git push origin v1.0.0
```

Swarm nodes must be able to pull `${IMAGE_PREFIX}`. Do not deploy mutable tags
for production releases.

## 4. Configure the private Stack environment

Create the Stack environment from `deploy/swarm/swarm.env.example` in Portainer
and replace every placeholder. Use `postgresql://` for PostgreSQL and
`redis://` or `rediss://` for Redis. Add provider-required TLS/query parameters
to the URLs. The stack validates every required value during rendering, so no
secret initialization script or manual `docker secret create` command is needed.

Do not commit the real `.env`. Before enabling billing, add the real Creem
sandbox values and product IDs. Environment-based secrets are visible to Swarm
Manager administrators through Docker service inspection; restrict Manager and
Portainer access accordingly.

## 5. Deploy the `trustcaptcha` stack

Validate and deploy:

```sh
docker stack config -c deploy/swarm/stack.yml >/dev/null
docker stack deploy --with-registry-auth --prune -c deploy/swarm/stack.yml trustcaptcha
docker stack services trustcaptcha
docker service ps trustcaptcha_migrate --no-trunc
```

The migration task waits for the external PostgreSQL endpoint, applies Prisma
migrations, and runs the idempotent seed once. On a new immutable image tag,
Swarm creates a new migration task. Do not direct production traffic to a
release whose migration task failed.

The initial login uses the configured `SEED_ADMIN_EMAIL` and
`SEED_ADMIN_PASSWORD` values.

## 6. Add the Caddy routes

Merge `deploy/swarm/Caddyfile` into the existing Caddy configuration. It expects
the stack service DNS names `trustcaptcha_demo`, `trustcaptcha_dashboard`, and
`trustcaptcha_api` on the shared overlay network.

Validate and reload using the paths and service name from the existing Caddy
deployment. A typical container command is:

```sh
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

Caddy obtains certificates automatically after all three DNS names resolve to
it and ports 80/443 are reachable.

## 7. Verify

```sh
curl -fsS https://api.trustcaptcha.xuandev.com/api/health
curl -fsSI https://trustcaptcha.xuandev.com/zh-CN
curl -fsSI https://app.trustcaptcha.xuandev.com/login
docker stack services trustcaptcha
docker service logs trustcaptcha_migrate
```

Also complete one live widget verification, confirm token replay is rejected,
sign in to the dashboard, upload a test brand image, and inspect the retention
service logs after its first scheduled run.

## Operational notes

- Enable automated backups and point-in-time recovery on the external
  PostgreSQL service, and test restores regularly.
- Configure Redis persistence/high availability according to the provider's
  service tier. The verification path fails closed if Redis is unavailable.
- To rotate a runtime secret, update the private Stack environment and redeploy
  after coordinating values such as the token key ring across all replicas.
- Keep `CREEM_TEST_MODE=true` until sandbox checkout and webhook flows pass.
- The `retention` service calls the protected retention endpoint every 24 hours.
