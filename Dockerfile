# ----------------------------------------------------
# Stage 1: Build Stage
# ----------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies (including devDependencies needed for build)
COPY package*.json tsconfig.json ./
RUN npm ci

# Copy application source code
COPY src/ ./src/

# Compile TypeScript to JavaScript in /app/dist
RUN npm run build

# ----------------------------------------------------
# Stage 2: Production Runtime Stage
# ----------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled files from builder
COPY --from=builder /app/dist ./dist

# Create non-root user for security
USER node

# Expose service port
EXPOSE 5000

# Health check inside container
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start server
CMD ["node", "dist/server.js"]
