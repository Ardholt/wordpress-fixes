FROM wordpress:6.8.3-php8.2-apache
# Use HTTPS and bounded requests; abort if any package index cannot be fetched.
RUN sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources \
 && printf 'Acquire::Retries "2";\nAcquire::http::Timeout "20";\nAcquire::https::Timeout "20";\nAPT::Update::Error-Mode "any";\n' > /etc/apt/apt.conf.d/80-fetch-limits \
 && timeout 360 apt-get update \
 && timeout 360 apt-get install -y --no-install-recommends default-mysql-client imagemagick \
 && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL --connect-timeout 15 --max-time 120 --retry 2 --retry-max-time 180 \
 https://github.com/wp-cli/wp-cli/releases/download/v2.12.0/wp-cli-2.12.0.phar -o /usr/local/bin/wp \
 && chmod +x /usr/local/bin/wp
# This reproduction repeatedly replaces PHP files; read their current bytes on every request.
# Load after the base image's opcache-recommended.ini. This is not the plugin repair.
RUN printf 'opcache.enable=0\nopcache.enable_cli=0\n' > /usr/local/etc/php/conf.d/zz-case-runtime.ini
