FROM mcr.microsoft.com/playwright:v1.56.1-noble@sha256:f1e7e01021efd65dd1a2c56064be399f3e4de00fd021ac561325f2bfbb2b837a
WORKDIR /tools
RUN apt-get update && apt-get install -y --no-install-recommends python3-pil imagemagick && rm -rf /var/lib/apt/lists/*
COPY tests/package.json tests/package-lock.json /tools/
RUN npm ci --no-audit --no-fund
ENV NODE_PATH=/tools/node_modules
ENV CHROME_PATH=/ms-playwright/chromium-1194/chrome-linux/chrome
WORKDIR /work
