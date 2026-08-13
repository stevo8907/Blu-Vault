# Multi-stage production build for Blu-Vault
# Stage 1: Build application assets and backend server bundle
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (including devDependencies needed for build)
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build the client SPA into dist/ and server into dist/server.cjs
RUN npm run build

# Stage 2: Production runtime environment
FROM node:20-alpine AS runner

WORKDIR /app

# Install dumb-init or curl for container healthchecks
RUN apk add --no-cache curl

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy package manifests and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Create config/data directories and assign permissions
RUN mkdir -p /config /app/data && chown -R node:node /app /config

# Expose server port
EXPOSE 3000

# Switch to non-root user for security
USER node

# Healthcheck to ensure Blu-Vault responds
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the compiled production server
CMD ["node", "dist/server.cjs"]
