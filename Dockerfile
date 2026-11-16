FROM node:24-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
FROM base AS migrations
RUN npm ci --include=dev
COPY . .
USER node
CMD ["./node_modules/.bin/sequelize-cli", "db:migrate", "--env", "docker"]

FROM base AS runtime
RUN npm ci --omit=dev

COPY --chown=node:node . .
USER node
EXPOSE 3000
CMD ["node", "server.js"]
