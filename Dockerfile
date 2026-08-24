FROM node:22-alpine

RUN apk add --no-cache curl

WORKDIR /app
COPY server.js ./

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "server.js"]
