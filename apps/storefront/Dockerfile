# Build context must be the monorepo root (not apps/storefront) so npm
# workspaces can resolve — in Railway, set
# RAILWAY_DOCKERFILE_PATH=apps/storefront/Dockerfile and leave the service's
# Root Directory unset.

FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/storefront/package.json apps/storefront/package.json
RUN npm ci

FROM deps AS build
COPY . .
# Vite bakes VITE_* vars into the client bundle at build time (import.meta.env),
# not read at runtime — Dockerfile builds on Railway don't inherit service
# variables automatically, so it has to be declared as ARG and re-exported as
# ENV here for `vite build` below to pick it up. Set it as a Railway service
# variable of the same name.
ARG VITE_MEDUSA_BACKEND_URL
ENV VITE_MEDUSA_BACKEND_URL=$VITE_MEDUSA_BACKEND_URL
RUN npm run build -w apps/storefront
RUN npm prune --omit=dev

# server.ts is bundled with esbuild --packages=external, so express/helmet/
# compression/dotenv are required from node_modules at runtime rather than
# inlined — keep the hoisted workspace node_modules instead of a fresh
# install, since there's no per-app lockfile to install from in isolation.
FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/storefront/dist ./apps/storefront/dist
COPY --from=build /repo/apps/storefront/package.json ./apps/storefront/package.json
WORKDIR /repo/apps/storefront
EXPOSE 3000
CMD ["node", "dist/server.cjs"]
