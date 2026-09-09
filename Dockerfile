FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl poppler-utils fonts-liberation && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js ./
COPY db ./db
COPY lib ./lib
COPY data/reading-guides.json ./data/reading-guides.json
COPY data/pdf-catalog.json ./data/pdf-catalog.json
COPY games/jail-house-poker/poker-service.js ./games/jail-house-poker/poker-service.js

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "server.js"]
