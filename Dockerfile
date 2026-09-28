FROM node:24-alpine AS build

WORKDIR /app

COPY package.json .npmrc ./

RUN npm install --no-audit --no-fund

COPY . .

ENV NODE_ENV=production

RUN npm run build


FROM node:24-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json .npmrc ./

RUN npm install --omit=dev --no-audit --no-fund \
    && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server

RUN mkdir -p dist-server/data server/data

RUN apk add --no-cache wget

EXPOSE 3000

HEALTHCHECK \
  --interval=30s \
  --timeout=5s \
  --start-period=30s \
  --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "dist-server/index.js"]
