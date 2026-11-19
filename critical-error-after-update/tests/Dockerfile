FROM mcr.microsoft.com/playwright:v1.56.1-noble
WORKDIR /runner
RUN npm install --save-exact playwright@1.56.1 && apt-get update && apt-get install -y --no-install-recommends imagemagick && rm -rf /var/lib/apt/lists/*
