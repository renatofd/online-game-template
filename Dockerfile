# Game server image. Build from the repository root:
#   docker build -t my-game-server .
#   docker run -p 2567:2567 -e ALLOWED_ORIGINS=https://my.game my-game-server
# See docs/DEPLOY.md for all environment variables.

FROM node:22-slim AS build
WORKDIR /repo
RUN corepack enable
# Download dependencies from the lockfile only, so this layer is cached until it changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm fetch
COPY . .
RUN pnpm install --frozen-lockfile --offline
ARG BUILD_ID=dev
RUN pnpm --filter @app/server build \
 && pnpm --filter @app/server deploy --prod --legacy /out \
 && mkdir -p /out/content && cp -r content/maps /out/content/maps

FROM node:22-slim
WORKDIR /app
ARG BUILD_ID=dev
ENV NODE_ENV=production \
    PORT=2567 \
    MAPS_DIR=/app/content/maps \
    BUILD_ID=$BUILD_ID
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 2567
HEALTHCHECK --interval=15s --timeout=3s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "build/index.js"]
