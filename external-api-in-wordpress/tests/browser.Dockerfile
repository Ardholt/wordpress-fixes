FROM mcr.microsoft.com/playwright:v1.51.1-noble
RUN npm install --prefix /opt/browser playwright@1.51.1 marked@15.0.7 github-markdown-css@5.8.1 && apt-get update && apt-get install -y --no-install-recommends imagemagick && rm -rf /var/lib/apt/lists/*
ENV NODE_PATH=/opt/browser/node_modules
