# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS base
RUN apk add --no-cache openssl libssl3 \
 && corepack enable \
 && corepack prepare pnpm@10.26.0 --activate
WORKDIR /repo

# Install all workspace deps in one pass — simpler than per-filter and keeps
# pnpm workspace symlinks intact for `@universe-test/contracts`.
FROM base AS builder
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json .npmrc ./
COPY packages packages
COPY apps/products apps/products
RUN pnpm install --frozen-lockfile \
 && pnpm --filter @universe-test/contracts build \
 && pnpm --filter @universe-test/products exec prisma generate \
 && pnpm --filter @universe-test/products build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /repo /repo
WORKDIR /repo/apps/products
EXPOSE 3001
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main"]
