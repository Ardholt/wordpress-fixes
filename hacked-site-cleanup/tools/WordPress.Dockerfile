FROM wordpress:6.8.3-php8.3-apache@sha256:30bff39330d1693b0ce13d32fc9b7bb67193064f040b7d60d3494e136fa599d4
COPY tools/apache-hardening.conf /etc/apache2/conf-available/case-hardening.conf
RUN a2enconf case-hardening
