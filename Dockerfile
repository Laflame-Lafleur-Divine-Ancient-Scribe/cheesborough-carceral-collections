FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js ./
COPY db ./db

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "server.js"]
