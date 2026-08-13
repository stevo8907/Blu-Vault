# Multi-stage production build for Blu-Vault
# Stage 1: Build application assets and backend server bundle
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (including devDependencies needed for build)
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Build the client SPA into dist/ and server into dist/server.cjs
RUN npm run build

# Stage 2: Production runtime environment
FROM node:20-alpine AS runner

WORKDIR /app

# Install curl for container healthchecks, and su-exec/shadow for permission management
RUN apk add --no-cache curl su-exec shadow

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV CONFIG_DIR=/config

# Copy package manifests and install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# Copy compiled artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Create base directories
RUN mkdir -p /config /app/data

# Copy entrypoint script and ensure executable permissions
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose server port
EXPOSE 3000

# Healthcheck to ensure Blu-Vault responds
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/server.cjs"]
