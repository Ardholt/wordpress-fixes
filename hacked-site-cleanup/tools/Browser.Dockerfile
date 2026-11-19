FROM node:22-bookworm-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee
WORKDIR /opt/checks
RUN npm install --save-exact playwright@1.56.1 && npx playwright install --with-deps chromium \
    && apt-get update && apt-get install -y --no-install-recommends imagemagick \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_PATH=/opt/checks/node_modules
ENTRYPOINT []
