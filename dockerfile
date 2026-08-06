# Use Node.js 20 LTS Alpine image for lightweight build
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy full application source code
COPY . .

# Build the Vite frontend and bundle the Express server (dist/server.cjs)
RUN npm run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled build output from builder stage
COPY --from=builder /app/dist ./dist

# Create data directory for local JSON database storage
RUN mkdir -p /app/data

# Expose port 3000
EXPOSE 3000

# Volume for database persistence
VOLUME ["/app/data"]

# Start the bundled Express server
CMD ["node", "dist/server.cjs"]
