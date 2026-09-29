# Build context must be the monorepo root (not apps/backend) so npm workspaces
# can resolve — in Railway, set RAILWAY_DOCKERFILE_PATH=apps/backend/Dockerfile
# and leave the service's Root Directory unset.

FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/storefront/package.json apps/storefront/package.json
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build -w apps/backend

# `medusa build` outputs a standalone bundle to apps/backend/.medusa/server —
# it doesn't rely on the workspace or the TS source, so it gets its own
# isolated install here rather than reusing /repo/node_modules.
FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /repo/apps/backend/.medusa/server ./
RUN npm install --omit=dev
EXPOSE 9000
CMD ["sh", "-c", "npm run predeploy && npm run start"]
