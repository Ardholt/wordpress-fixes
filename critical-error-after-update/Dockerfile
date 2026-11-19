FROM wordpress:6.8.3-php8.2-apache
RUN apt-get update && apt-get install -y --no-install-recommends default-mysql-client && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://github.com/wp-cli/wp-cli/releases/download/v2.12.0/wp-cli-2.12.0.phar -o /usr/local/bin/wp && chmod +x /usr/local/bin/wp
RUN printf 'opcache.revalidate_freq=0\n' > /usr/local/etc/php/conf.d/case.ini
