FROM wordpress:cli-2.12.0-php8.3 AS cli
FROM wordpress:6.8.3-php8.3-apache
COPY --from=cli /usr/local/bin/wp /usr/local/bin/wp
