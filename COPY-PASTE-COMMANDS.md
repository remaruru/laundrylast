# Copy-Paste Commands for AWS Deployment

Follow these commands **ONE BY ONE** in order:

## Step 1: Connect to AWS EC2

Replace `your-key.pem` with your actual key file name:

```bash
ssh -i your-key.pem ubuntu@16.176.159.240
```

## Step 2: Update System

```bash
sudo apt-get update
```

```bash
sudo apt-get upgrade -y
```

## Step 3: Install Required Packages

```bash
sudo apt-get install -y software-properties-common curl git unzip nginx mysql-server php8.2 php8.2-fpm php8.2-mysql php8.2-xml php8.2-mbstring php8.2-curl php8.2-zip php8.2-gd php8.2-bcmath php8.2-cli php8.2-common
```

## Step 4: Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
```

```bash
sudo apt-get install -y nodejs
```

## Step 5: Install Composer

```bash
curl -sS https://getcomposer.org/installer | php
```

```bash
sudo mv composer.phar /usr/local/bin/composer
```

```bash
sudo chmod +x /usr/local/bin/composer
```

## Step 6: Configure MySQL Database

```bash
sudo mysql -e "CREATE DATABASE IF NOT EXISTS laundry_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

```bash
sudo mysql -e "CREATE USER IF NOT EXISTS 'washnet'@'localhost' IDENTIFIED BY 'gelo123';"
```

```bash
sudo mysql -e "GRANT ALL PRIVILEGES ON laundry_db.* TO 'washnet'@'localhost';"
```

```bash
sudo mysql -e "FLUSH PRIVILEGES;"
```

## Step 7: Clone Repository

```bash
cd ~
```

```bash
git clone https://github.com/remaruru/laundrylast.git
```

```bash
cd laundrylast
```

## Step 8: Setup Backend

```bash
cd laundry-backend
```

```bash
composer install --no-dev --optimize-autoloader
```

## Step 9: Configure Backend .env File

```bash
cp .env.example .env
```

Now edit the .env file:

```bash
nano .env
```

Update these lines in the .env file:
- Change `APP_URL=http://localhost` to `APP_URL=http://16.176.159.240`
- Change `DB_CONNECTION=sqlite` to `DB_CONNECTION=mysql`
- Uncomment and set:
  - `DB_HOST=127.0.0.1`
  - `DB_PORT=3306`
  - `DB_DATABASE=laundry_db`
  - `DB_USERNAME=washnet`
  - `DB_PASSWORD=gelo123`
- Change `APP_DEBUG=true` to `APP_DEBUG=false`
- Change `APP_ENV=local` to `APP_ENV=production`

Press `Ctrl+X`, then `Y`, then `Enter` to save.

## Step 10: Generate Laravel Key

```bash
php artisan key:generate
```

## Step 11: Run Migrations

```bash
php artisan migrate --force
```

## Step 12: Seed Database

```bash
php artisan db:seed --force
```

## Step 13: Create Storage Link

```bash
php artisan storage:link
```

## Step 14: Set Permissions

```bash
sudo chown -R www-data:www-data storage bootstrap/cache
```

```bash
sudo chmod -R 775 storage bootstrap/cache
```

## Step 15: Cache Configuration

```bash
php artisan config:cache
```

```bash
php artisan route:cache
```

```bash
php artisan view:cache
```

## Step 16: Setup Frontend

```bash
cd ../laundry-frontend
```

```bash
npm install
```

## Step 17: Build Frontend

```bash
REACT_APP_API_URL=http://16.176.159.240/api npm run build
```

## Step 18: Configure Nginx

```bash
cd ~/laundrylast
```

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/laundry-app
```

Paste this configuration (replace with your actual path):

```nginx
server {
    listen 80;
    server_name 16.176.159.240;
    
    client_max_body_size 20M;

    # Backend API
    location /api {
        try_files $uri $uri/ /index.php?$query_string;
        root /home/ubuntu/laundrylast/laundry-backend/public;
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME /home/ubuntu/laundrylast/laundry-backend/public/index.php;
        include fastcgi_params;
        fastcgi_param PATH_INFO $fastcgi_path_info;
    }

    # Laravel storage files
    location ~ ^/storage/(.+)$ {
        alias /home/ubuntu/laundrylast/laundry-backend/storage/app/public/$1;
        access_log off;
        expires 30d;
    }

    # Frontend - serve React app
    location / {
        root /home/ubuntu/laundrylast/laundry-frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

Press `Ctrl+X`, then `Y`, then `Enter` to save.

## Step 19: Enable Nginx Site

```bash
sudo ln -sf /etc/nginx/sites-available/laundry-app /etc/nginx/sites-enabled/
```

```bash
sudo rm -f /etc/nginx/sites-enabled/default
```

## Step 20: Test Nginx Configuration

```bash
sudo nginx -t
```

## Step 21: Restart Services

```bash
sudo systemctl restart nginx
```

```bash
sudo systemctl restart php8.2-fpm
```

## Step 22: Configure Firewall

```bash
sudo ufw allow 'Nginx Full'
```

```bash
sudo ufw allow ssh
```

```bash
sudo ufw enable
```

## Step 23: Access Your Application

Open your browser and go to:
```
http://16.176.159.240
```

## Quick Status Checks

Check if everything is running:

```bash
sudo systemctl status nginx
```

```bash
sudo systemctl status php8.2-fpm
```

```bash
sudo systemctl status mysql
```

---

## Or Use the Automated Script (Easier!)

If you want to use the automated script instead:

```bash
cd ~/laundrylast
```

```bash
chmod +x deploy-aws.sh
```

```bash
sudo ./deploy-aws.sh
```

This will do all the above steps automatically!
