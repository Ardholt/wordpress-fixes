FROM mcr.microsoft.com/playwright:v1.56.1-noble@sha256:f1e7e01021efd65dd1a2c56064be399f3e4de00fd021ac561325f2bfbb2b837a
WORKDIR /opt/layout
RUN npm init -y >/dev/null && npm install --save-exact playwright@1.56.1 marked@15.0.12 github-markdown-css@5.8.1 >/dev/null
ENV NODE_PATH=/opt/layout/node_modules PREVIEW_MODULES=/opt/layout/node_modules
WORKDIR /work
