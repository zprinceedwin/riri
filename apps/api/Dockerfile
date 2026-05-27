# Riri API - deployable to Railway / Render / Fly.io / AWS App Runner
FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

FROM base AS deps
# Workspace layout: copy manifests first to leverage Docker layer cache
COPY pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/personas/package.json ./packages/personas/
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY . .
# We run with tsx directly so there's no separate build step.
# (If you'd rather compile, run `pnpm --filter @riri/api build` here.)

FROM build AS runtime
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001
CMD ["pnpm", "--filter", "@riri/api", "start"]
