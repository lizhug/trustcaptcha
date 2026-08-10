# Gitea Actions CI/CD

The workflow at `.gitea/workflows/build-deploy.yml` validates the workspace and publishes the four Docker images consumed by the Swarm stack. Docker images are built only by CI.

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

Add these Actions variables. They are public values embedded into the Next.js browser bundles at image-build time:

| Variable                      | Production value                       |
| ----------------------------- | -------------------------------------- |
| `NEXT_PUBLIC_API_URL`         | `https://api.trustcaptcha.xuandev.com` |
| `NEXT_PUBLIC_DASHBOARD_URL`   | `https://app.trustcaptcha.xuandev.com` |
| `NEXT_PUBLIC_DEMO_SITE_KEY`   | The public demo Site Key               |
| `NEXT_PUBLIC_SIGNUP_SITE_KEY` | The public signup Site Key             |
| `NEXT_PUBLIC_SITE_URL`        | `https://trustcaptcha.xuandev.com`     |

The workflow fails before the Docker build if a required public variable is empty.

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
