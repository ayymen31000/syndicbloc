# Dockerfile - Production hardened container for SyndicBloc
FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

# Copy source files
COPY . .

# Production runner stage
FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Install openssl for prisma engine
RUN apk add --no-cache openssl

COPY --from=builder /app /app

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push && node src/server.js"]
