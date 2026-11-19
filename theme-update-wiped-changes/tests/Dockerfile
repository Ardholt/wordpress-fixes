FROM mcr.microsoft.com/playwright:v1.56.1-noble
WORKDIR /runner
RUN npm init -y && npm install --save-exact playwright@1.56.1 && npm cache clean --force
RUN apt-get update && apt-get install -y --no-install-recommends imagemagick unzip && rm -rf /var/lib/apt/lists/*
ENV NODE_PATH=/runner/node_modules
