# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.26.0 --activate
WORKDIR /repo

FROM base AS builder
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json .npmrc ./
COPY packages packages
COPY apps/notifications apps/notifications
RUN pnpm install --frozen-lockfile \
 && pnpm --filter @universe-test/contracts build \
 && pnpm --filter @universe-test/notifications build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /repo /repo
WORKDIR /repo/apps/notifications
EXPOSE 3002
CMD ["node", "dist/main"]
