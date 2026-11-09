# syntax=docker/dockerfile:1.26@sha256:ecfaec9ed6d810b56388c508f4121597bfbba70d41a6dfeee4d8cad5f295fc32

FROM node:22-bookworm-slim@sha256:5ec23b7c622b00547753bc6ffd78085dd868a68aeb41c8e0a1418f033e13d96d AS build

ENV DEBIAN_FRONTEND=noninteractive \
    PUPPETEER_SKIP_DOWNLOAD=true \
    npm_config_audit=false \
    npm_config_fund=false

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json tsconfig.json vite.config.ts vitest.config.ts ./
RUN npm install --no-audit --no-fund

COPY src ./src
COPY prompts ./prompts
COPY test ./test

RUN chmod -R a=rX prompts src/templates \
  && npm run build

FROM build AS test

CMD ["npm", "test"]

FROM build AS production-deps

RUN npm prune --omit=dev

FROM node:22-bookworm-slim@sha256:5ec23b7c622b00547753bc6ffd78085dd868a68aeb41c8e0a1418f033e13d96d AS runtime

ENV DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=production \
    HOME=/tmp \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PUPPETEER_SKIP_DOWNLOAD=true

RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium chromium-sandbox ca-certificates tini \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=production-deps /app/package.json ./package.json
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prompts ./prompts
COPY --from=build /app/src/templates ./dist/templates

ENTRYPOINT ["/usr/bin/tini", "-s", "--", "node", "dist/cli.js"]
CMD ["--help"]
