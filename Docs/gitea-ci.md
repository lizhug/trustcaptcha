# Gitea Actions CI/CD

The workflow at `.gitea/workflows/build-deploy.yml` validates the workspace and publishes the four Docker images consumed by the Swarm stack. Docker images are built only by CI.

BuildKit uses a small per-image Actions cache. Cache export is best-effort, so a
temporary runner artifact-cache outage cannot fail an image that was already
published successfully.

## Trigger tags

| Git tag     | Published image tags        | Deployment                             |
| ----------- | --------------------------- | -------------------------------------- |
| `staging-*` | Exact Git tag and `staging` | No automatic webhook                   |
| `v*`        | Exact Git tag and `prod`    | Calls the production Portainer webhook |

For example, tag `v1.2.0` publishes both `v1.2.0` and `prod` for every image.

## Published repositories

- `ci-internal.routemarket.ai/pxtech/trustcaptcha/api`
- `ci-internal.routemarket.ai/pxtech/trustcaptcha/dashboard`
- `ci-internal.routemarket.ai/pxtech/trustcaptcha/demo`
- `ci-internal.routemarket.ai/pxtech/trustcaptcha/migrate`

## Gitea repository configuration

Add these Actions secrets to the repository:

| Secret                  | Purpose                                           |
| ----------------------- | ------------------------------------------------- |
| `REGISTRY_USERNAME`     | Container-registry login name                     |
| `REGISTRY_TOKEN`        | Container-registry password or access token       |
| `PORTAINER_WEBHOOK_URL` | Production stack webhook; used only for `v*` tags |

No public URL or Site Key is required during CI. Images are environment-neutral;
the private Swarm Stack environment supplies public URLs, Site Keys, data-service
connections, and security keys when each container starts.

## Release procedure

After merging and testing the desired commit, create and push a tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The production Swarm/Portainer stack should set:

```dotenv
IMAGE_PREFIX=ci-internal.routemarket.ai/pxtech/trustcaptcha
IMAGE_TAG=prod
```

For a rollback, set `IMAGE_TAG` to a previously published immutable Git tag such as `v1.0.0`, then redeploy the stack.
