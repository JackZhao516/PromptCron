#!/bin/bash

# Install PM2 globally if not installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

# Create runtime directory
mkdir -p runtime

# Build frontend
cd frontend
npm run build
sudo cp -r build/* /var/www/promptcron/

# Go to backend directory
cd ../backend

# Install gunicorn if not installed
source venv/bin/activate
pip install gunicorn

# Start backend with PM2
pm2 delete flask-backend 2>/dev/null || true
pm2 start "$(which gunicorn) --workers=1 --bind 0.0.0.0:8000 app:application" --name flask-backend

echo "Application is running!"
echo "Monitor the backend with: pm2 monit" 