FROM php:8.3-fpm-alpine

# System deps
RUN apk add --no-cache nginx supervisor git curl postgresql-dev

# PHP extensions
RUN docker-php-ext-install pdo pdo_pgsql pcntl bcmath

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy composer files first for cache
COPY composer.json composer.lock* ./
RUN composer install --no-scripts --no-autoloader --prefer-dist 2>/dev/null || true

COPY . .
RUN composer dump-autoload --optimize 2>/dev/null || true

# Nginx config
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Supervisord config
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Permissions
RUN mkdir -p storage/logs storage/framework/{cache,sessions,views} bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 8000
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
