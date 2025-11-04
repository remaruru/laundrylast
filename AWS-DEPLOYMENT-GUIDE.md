# AWS EC2 Deployment Guide

## Prerequisites
- AWS EC2 Ubuntu instance running
- SSH access to your EC2 instance
- Public IP: 16.176.159.240
- Private IP: 172.31.15.209

## Step-by-Step Deployment Instructions

### Step 1: Connect to Your EC2 Instance

```bash
ssh -i your-key.pem ubuntu@16.176.159.240
```

### Step 2: Clone Your Repository

```bash
cd ~
git clone https://github.com/remaruru/laundrylast.git
cd laundrylast
```

### Step 3: Make the Deployment Script Executable

```bash
chmod +x deploy-aws.sh
```

### Step 4: Run the Deployment Script

```bash
sudo ./deploy-aws.sh
```

This script will:
- Update system packages
- Install PHP 8.2, MySQL, Nginx, Node.js, and Composer
- Create the database `laundry_db` with user `washnet` and password `gelo123`
- Configure the Laravel backend
- Build the React frontend
- Set up Nginx to serve the application

### Step 5: Configure AWS Security Group

1. Go to AWS EC2 Console
2. Select your instance
3. Click on "Security" tab
4. Click on the Security Group
5. Edit Inbound Rules:
   - Add rule: Type: HTTP, Port: 80, Source: 0.0.0.0/0
   - Add rule: Type: HTTPS, Port: 443, Source: 0.0.0.0/0 (optional for SSL)
   - Add rule: Type: SSH, Port: 22, Source: Your IP (for security)

### Step 6: Configure Firewall (if needed)

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw enable
```

### Step 7: Access Your Application

Open your browser and navigate to:
```
http://16.176.159.240
```

## Database Configuration

The deployment script automatically configures:
- **Database Name**: `laundry_db`
- **Database User**: `washnet`
- **Database Password**: `gelo123`
- **Database Host**: `127.0.0.1` (localhost)

## Manual Configuration (if needed)

If you need to manually configure the database:

```bash
sudo mysql
```

Then in MySQL:

```sql
CREATE DATABASE IF NOT EXISTS laundry_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'washnet'@'localhost' IDENTIFIED BY 'gelo123';
GRANT ALL PRIVILEGES ON laundry_db.* TO 'washnet'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Updating the Application

If you make changes to your code:

```bash
cd ~/laundrylast
git pull
cd laundry-backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
cd ../laundry-frontend
npm install
REACT_APP_API_URL=http://16.176.159.240/api npm run build
sudo systemctl restart nginx
```

## Troubleshooting

### Check Nginx Status
```bash
sudo systemctl status nginx
```

### Check PHP-FPM Status
```bash
sudo systemctl status php8.2-fpm
```

### View Nginx Error Logs
```bash
sudo tail -f /var/log/nginx/error.log
```

### View Laravel Logs
```bash
tail -f ~/laundrylast/laundry-backend/storage/logs/laravel.log
```

### Test Nginx Configuration
```bash
sudo nginx -t
```

### Restart Services
```bash
sudo systemctl restart nginx
sudo systemctl restart php8.2-fpm
```

## Important Notes

1. **Environment Variables**: The frontend API URL is set during the build process using `REACT_APP_API_URL`
2. **Permissions**: Make sure storage and cache directories have correct permissions
3. **Database**: The database is created automatically by the script
4. **SSL/HTTPS**: For production, consider setting up SSL certificate with Let's Encrypt

## File Locations

- **Backend**: `~/laundrylast/laundry-backend`
- **Frontend Build**: `~/laundrylast/laundry-frontend/build`
- **Nginx Config**: `/etc/nginx/sites-available/laundry-app`
- **Database**: MySQL on localhost

## Default Admin Account

After running the database seeder, you should have an admin account. Check the `database/seeders/AdminSeeder.php` file for the default credentials.
