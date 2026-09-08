# Multi-stage production Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and package configurations
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

# Robust npm network configuration with retries & high timeout
RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm config set fetch-timeout 600000 \
    && npm ci

# Copy source files & data
COPY erp_bus_data.json ./erp_bus_data.json
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY apps/web ./apps/web

# Build all packages
ENV NODE_ENV=production
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/api
RUN npm run build --workspace=apps/web
RUN mkdir -p /app/apps/web/public

# Prune devDependencies locally so runner doesn't need to download anything from the internet
RUN npm prune --omit=dev

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

# Copy pre-pruned node_modules directly from builder (0 bandwidth required)
COPY --from=builder /app/node_modules ./node_modules

# Copy ERP data and all scripts (gateway, entrypoint, etc.)
COPY erp_bus_data.json ./erp_bus_data.json
COPY scripts ./scripts
RUN chmod +x ./scripts/docker-entrypoint.sh

# Copy compiled outputs
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000 3001 3002

ENTRYPOINT ["/bin/sh", "/app/scripts/docker-entrypoint.sh"]
