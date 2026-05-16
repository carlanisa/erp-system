#!/bin/bash
set -e

echo "========================================"
echo "  ERP System - Backend Setup"
echo "========================================"

# Check if composer is installed
if ! command -v composer &>/dev/null; then
    echo "ERROR: Composer is not installed. Install from https://getcomposer.org"
    exit 1
fi

# Check if PHP >= 8.2
PHP_VERSION=$(php -r "echo PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION;")
echo "PHP Version: $PHP_VERSION"

echo ""
echo "Step 1: Installing Laravel..."
composer create-project laravel/laravel . --prefer-dist

echo ""
echo "Step 2: Installing additional packages..."
composer require laravel/sanctum spatie/laravel-permission

echo ""
echo "Step 3: Setting up environment..."
cp .env.example .env
php artisan key:generate

echo ""
echo "Step 4: Publishing Sanctum config..."
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"

echo ""
echo "========================================"
echo "  Setup Complete!"
echo ""
echo "  Next steps:"
echo "  1. Update .env with your DB credentials"
echo "  2. Run: php artisan migrate --seed"
echo "  3. Run: php artisan serve --port=8001"
echo "========================================"
