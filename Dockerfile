# ==========================================
# Multi-stage Dockerfile for Next.js Frontend
# ==========================================

# 1. Dependency installation stage
FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat
COPY package*.json ./
RUN npm ci

# 2. Build stage
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time environment variables for Next.js public assets
ARG NEXT_PUBLIC_API_URL=http://localhost:5000
ARG NEXT_PUBLIC_KID_CLIENT_ID=pk_cc4a0155-da8a-47fa-a659-8facccfb5eb6
ARG NEXT_PUBLIC_KID_REDIRECT_URI=http://localhost:3000/auth/kid/callback
ARG KID_CLIENT_ID=pk_cc4a0155-da8a-47fa-a659-8facccfb5eb6
ARG KID_CLIENT_SECRET=sk_6ce0550e-1ec8-4426-a12f-760d9223cd10
ARG KID_REDIRECT_URI=http://localhost:3000/auth/kid/callback
ARG KID_BASE_URL=https://api.kid.koompi.org

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_KID_CLIENT_ID=$NEXT_PUBLIC_KID_CLIENT_ID
ENV NEXT_PUBLIC_KID_REDIRECT_URI=$NEXT_PUBLIC_KID_REDIRECT_URI
ENV KID_CLIENT_ID=$KID_CLIENT_ID
ENV KID_CLIENT_SECRET=$KID_CLIENT_SECRET
ENV KID_REDIRECT_URI=$KID_REDIRECT_URI
ENV KID_BASE_URL=$KID_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# 3. Production runner stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy static assets and standalone server
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD ["node", "server.js"]
