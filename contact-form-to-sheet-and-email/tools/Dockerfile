FROM mcr.microsoft.com/playwright:v1.56.1-noble
RUN apt-get update && apt-get install -y --no-install-recommends imagemagick python3 libreoffice-calc xvfb xauth xdotool && rm -rf /var/lib/apt/lists/*
WORKDIR /opt/checks
RUN npm init -y && npm install --save-exact playwright@1.56.1 marked@16.4.1 github-markdown-css@5.8.1
ENV NODE_PATH=/opt/checks/node_modules
