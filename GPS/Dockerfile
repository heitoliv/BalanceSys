FROM docker.io/library/node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npm run prisma:generate
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
COPY tests ./tests
COPY public ./public
RUN npm run build

FROM docker.io/library/node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY public ./dist/public
RUN mkdir -p /app/.local && chown -R node:node /app/.local
USER node
EXPOSE 3000
CMD ["node", "dist/src/main.js"]

# Tarefa única de migração para servidores que recebem apenas as imagens.
FROM builder AS migrator
USER node
CMD ["npm", "run", "prisma:migrate"]
