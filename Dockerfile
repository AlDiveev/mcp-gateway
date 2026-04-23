FROM node:22-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install -g npm@11
COPY package*.json ./
COPY prisma ./prisma
RUN npm install --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install -g npm@11
COPY package*.json ./
COPY prisma ./prisma
RUN npm install --omit=dev --no-audit --no-fund
RUN npx prisma generate
COPY --from=builder /app/dist ./dist
COPY public ./public
EXPOSE 3000 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
