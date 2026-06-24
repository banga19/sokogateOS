# ──────────────────────────────────────────────
# Stage 1: Install ALL dependencies (dev + prod)
# ──────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# ──────────────────────────────────────────────
# Stage 2: Build / prune
# ──────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prune dev dependencies for production
# (TypeScript type checking runs in CI — no need to duplicate here)
RUN npm prune --production

# ──────────────────────────────────────────────
# Stage 3: Production image
# ──────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 sokogate

WORKDIR /app

# Copy production dependencies and source
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json

# Create data directory for QMe
RUN mkdir -p /app/data /app/logs && chown -R sokogate:sokogate /app/data /app/logs

USER sokogate

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

CMD ["node", "src/index.js"]
