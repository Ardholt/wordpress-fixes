FROM mcr.microsoft.com/playwright:v1.56.1-noble
COPY tools/install-packages.sh /opt/install-packages.sh
RUN bash /opt/install-packages.sh
WORKDIR /opt/checks
RUN npm init -y && timeout --kill-after=15 240 npm install --save-exact --no-audit --no-fund --fetch-retries=2 --fetch-timeout=30000 --fetch-retry-mintimeout=2000 --fetch-retry-maxtimeout=10000 playwright@1.56.1 marked@16.4.1 github-markdown-css@5.8.1
ENV NODE_PATH=/opt/checks/node_modules
