# Multi-stage production Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and package configurations
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

RUN npm ci

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

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

RUN npm ci --omit=dev

# Copy ERP data and scripts
COPY erp_bus_data.json ./erp_bus_data.json
COPY scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
RUN chmod +x ./scripts/docker-entrypoint.sh

# Copy compiled outputs
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000 3001

ENTRYPOINT ["/bin/sh", "/app/scripts/docker-entrypoint.sh"]
