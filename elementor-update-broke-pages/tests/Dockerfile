FROM mcr.microsoft.com/playwright:v1.51.1-noble
RUN apt-get update && apt-get install -y --no-install-recommends imagemagick && rm -rf /var/lib/apt/lists/*
WORKDIR /tools
RUN npm init -y && npm install --save-exact playwright@1.51.1 pngjs@7.0.0
ENV NODE_PATH=/tools/node_modules
WORKDIR /case
ENTRYPOINT ["node"]
