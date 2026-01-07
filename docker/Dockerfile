# Bubo - Production-Ready AI Coding Agent
# Multi-stage build for optimal image size

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Stage 2: Runtime
FROM node:20-alpine AS runtime

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    git \
    openssh-client \
    curl \
    bash

# Install GitHub CLI
RUN apk add --no-cache github-cli

# Create non-root user for security
RUN addgroup -g 1001 bubo && \
    adduser -u 1001 -G bubo -s /bin/bash -D bubo

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Set up git configuration directory
RUN mkdir -p /home/bubo/.config/git && \
    chown -R bubo:bubo /home/bubo

# Switch to non-root user
USER bubo

# Environment variables
ENV NODE_ENV=production
ENV BUBO_LOG_LEVEL=info

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('healthy')" || exit 1

# Default command
ENTRYPOINT ["node", "dist/cli/index.js"]
CMD ["--help"]

