# Stage 1: Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
RUN npm ci

# Copy TypeScript configuration and source code
COPY tsconfig.json ./
COPY src/ ./src/
COPY types/ ./types/

# Build the TypeScript application
RUN npm run build

# Prune development dependencies
RUN npm prune --production

# Stage 2: Production stage
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Copy built artifacts and production dependencies from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Create and use non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app
USER nodejs

# Expose the WebSocket server port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Command to run the application
CMD ["node", "dist/server.js"]