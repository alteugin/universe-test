FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.26.0 --activate
WORKDIR /repo

FROM base AS builder
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json .npmrc ./
COPY packages packages
COPY apps/web apps/web
RUN pnpm install --frozen-lockfile \
 && pnpm --filter @universe-test/contracts build \
 && pnpm --filter @universe-test/web build

# Next.js standalone output already includes a self-contained server.js + pruned node_modules.
FROM node:22-alpine AS runner
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=builder /repo/apps/web/.next/standalone ./
COPY --from=builder /repo/apps/web/.next/static ./apps/web/.next/static
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
