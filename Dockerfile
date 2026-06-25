# ──────────────────────────────────────────────
# Native Addon Build Notes
# ──────────────────────────────────────────────
# The following native addons are transitive dependencies (via agentic-flow):
#
#   sharp@0.32.6             — Image processing. Has prebuilt musl binaries for Alpine.
#                              Config: ENV npm_config_sharp_libc=musl
#   better-sqlite3@11.10.0   — SQLite binding. Compiles from source via node-gyp.
#   argon2@0.44.0            — Password hashing. Compiles from source via node-gyp.
#   hnswlib-node@3.0.0       — Vector search. Compiles from source via node-gyp.
#   onnxruntime-node@1.26.0  — ML runtime. NOT used in application code (transitive dep
#                              only). gcompat is auto-installed by libc6-compat on Alpine
#                              3.24+ and may allow its glibc prebuilt to load at runtime.
#
# Build dependencies required: python3, make, g++, gcc (build-base)
# ──────────────────────────────────────────────

# ──────────────────────────────────────────────
# Stage 1: Install ALL dependencies (dev + prod)
# ──────────────────────────────────────────────
FROM node:22-alpine AS deps

# Install build toolchain for native addon compilation
#   build-base → gcc, g++, make, libc-dev (∼150 MB download)
#   python3    → required by node-gyp for all native addon compilation
#   linux-headers → required by some C++ native addons (e.g. hnswlib-node)
#   libc6-compat → pulls in gcompat as a dependency on Alpine 3.24+
#                  (provides glibc ABI compat for prebuilt binaries)
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    build-base \
    linux-headers

# Configure npm to use sharp's prebuilt musl binaries on Alpine
# (sharp reads npm_config_sharp_libc as an environment variable, not a core npm config key)
ENV npm_config_sharp_libc=musl

WORKDIR /app

# Copy dependency manifests first (leverages Docker layer caching)
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
# --prefer-offline uses the npm cache when available
# MAKEFLAGS=-j$(nproc) parallelizes native addon compilation (shell-expanded in RUN)
RUN MAKEFLAGS="-j$(nproc)" npm ci --prefer-offline

# ──────────────────────────────────────────────
# Stage 2: Build / prune
# ──────────────────────────────────────────────
FROM node:22-alpine AS builder

# Runtime libs for native addon binaries
# libc6-compat auto-installs gcompat on Alpine 3.24+ for glibc ABI compat
RUN apk add --no-cache libc6-compat

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prune dev dependencies for production
# (TypeScript type checking runs in CI — no need to duplicate here)
RUN npm prune --production

# ──────────────────────────────────────────────
# Stage 3: Production image
# ──────────────────────────────────────────────
FROM node:22-alpine AS runner

# Runtime libs for native addon binaries
RUN apk add --no-cache libc6-compat

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
