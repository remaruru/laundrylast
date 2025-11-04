#!/bin/bash

# AWS EC2 Ubuntu Deployment Script for Laundry Management System
# This script installs all dependencies and sets up the application

set -e  # Exit on error

echo "========================================="
echo "AWS EC2 Deployment Script"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
PUBLIC_IP="16.176.159.240"
DB_NAME="laundry_db"
DB_USER="washnet"
DB_PASSWORD="gelo123"
APP_URL="http://${PUBLIC_IP}"
PROJECT_DIR=$(pwd)

echo -e "${GREEN}Step 1: Updating system packages...${NC}"
sudo apt-get update
sudo apt-get upgrade -y

echo -e "${GREEN}Step 2: Installing required packages...${NC}"
sudo apt-get install -y \
    software-properties-common \
    curl \
    git \
    unzip \
    nginx \
    mysql-server \
    php8.2 \
    php8.2-fpm \
    php8.2-mysql \
    php8.2-xml \
    php8.2-mbstring \
    php8.2-curl \
    php8.2-zip \
    php8.2-gd \
    php8.2-bcmath \
    php8.2-cli \
    php8.2-common

echo -e "${GREEN}Step 3: Installing Node.js and npm...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

echo -e "${GREEN}Step 4: Installing Composer...${NC}"
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
sudo chmod +x /usr/local/bin/composer

echo -e "${GREEN}Step 5: Configuring MySQL...${NC}"
sudo mysql -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';"
sudo mysql -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

echo -e "${GREEN}Step 6: Setting up backend...${NC}"
cd laundry-backend

# Copy .env file if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
fi

# Configure .env file
cat > .env << EOF
APP_NAME=Laravel
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=${APP_URL}

APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=en_US

APP_MAINTENANCE_DRIVER=file

PHP_CLI_SERVER_WORKERS=4

BCRYPT_ROUNDS=12

LOG_CHANNEL=stack
LOG_STACK=single
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=${DB_NAME}
DB_USERNAME=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=null

BROADCAST_CONNECTION=log
FILESYSTEM_DISK=local
QUEUE_CONNECTION=database

CACHE_STORE=database

MEMCACHED_HOST=127.0.0.1

REDIS_CLIENT=phpredis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_MAILER=log
MAIL_SCHEME=null
MAIL_HOST=127.0.0.1
MAIL_PORT=2525
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_FROM_ADDRESS="hello@example.com"
MAIL_FROM_NAME="\${APP_NAME}"

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=
AWS_USE_PATH_STYLE_ENDPOINT=false

VITE_APP_NAME="\${APP_NAME}"
EOF

echo -e "${GREEN}Step 7: Installing backend dependencies...${NC}"
composer install --no-dev --optimize-autoloader

echo -e "${GREEN}Step 8: Generating application key...${NC}"
php artisan key:generate

echo -e "${GREEN}Step 9: Running database migrations...${NC}"
php artisan migrate --force

echo -e "${GREEN}Step 10: Seeding database...${NC}"
php artisan db:seed --force

echo -e "${GREEN}Step 11: Creating storage symlink...${NC}"
php artisan storage:link

echo -e "${GREEN}Step 12: Setting permissions...${NC}"
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache

echo -e "${GREEN}Step 13: Optimizing Laravel...${NC}"
php artisan config:cache
php artisan route:cache
php artisan view:cache

cd ../laundry-frontend

echo -e "${GREEN}Step 14: Installing frontend dependencies...${NC}"
npm install

echo -e "${GREEN}Step 15: Building frontend...${NC}"
REACT_APP_API_URL=${APP_URL}/api npm run build

echo -e "${GREEN}Step 16: Configuring Nginx...${NC}"
cd ..

sudo tee /etc/nginx/sites-available/laundry-app > /dev/null << EOF
server {
    listen 80;
    server_name ${PUBLIC_IP};
    
    client_max_body_size 20M;

    # Backend API - must come before frontend
    location /api {
        try_files \$uri \$uri/ /index.php?\$query_string;
        root ${PROJECT_DIR}/laundry-backend/public;
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME ${PROJECT_DIR}/laundry-backend/public/index.php;
        include fastcgi_params;
        fastcgi_param PATH_INFO \$fastcgi_path_info;
    }

    # Laravel storage files
    location ~ ^/storage/(.+)$ {
        alias ${PROJECT_DIR}/laundry-backend/storage/app/public/\$1;
        access_log off;
        expires 30d;
    }

    # Frontend - serve React app
    location / {
        root ${PROJECT_DIR}/laundry-frontend/build;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/laundry-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

echo -e "${GREEN}Step 17: Testing Nginx configuration...${NC}"
sudo nginx -t

echo -e "${GREEN}Step 18: Restarting services...${NC}"
sudo systemctl restart nginx
sudo systemctl restart php8.2-fpm
sudo systemctl enable nginx
sudo systemctl enable php8.2-fpm

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo -e "Application URL: ${APP_URL}"
echo -e "Database: ${DB_NAME}"
echo -e "Database User: ${DB_USER}"
echo -e ""
echo -e "${YELLOW}Important: Make sure to:${NC}"
echo -e "1. Configure your AWS Security Group to allow HTTP (port 80) traffic"
echo -e "2. Check firewall: sudo ufw allow 'Nginx Full'"
echo -e "3. Test the application at: ${APP_URL}"
echo -e "${GREEN}=========================================${NC}"
