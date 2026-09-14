FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    poppler-utils \
    fonts-liberation \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY db ./db
COPY lib ./lib
COPY data ./data
COPY games/jail-house-poker ./games/jail-house-poker
COPY *.html ./
COPY *.css ./
COPY *.js ./

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "server.js"]
