FROM mcr.microsoft.com/playwright:v1.56.1-noble
WORKDIR /runner
# Chromium and its OS libraries are already installed in this image.
RUN npm install --save-exact --no-audit --no-fund \
 --fetch-retries=2 --fetch-timeout=30000 \
 --fetch-retry-mintimeout=2000 --fetch-retry-maxtimeout=10000 playwright@1.56.1
