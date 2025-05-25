#!/bin/bash

# Build frontend
cd frontend
npm run build
sudo cp -r build/* /var/www/promptcron/

# Start backend
cd ../backend
source venv/bin/activate
gunicorn app:app --bind 0.0.0.0:8000 --workers 4 --daemon

echo "Application is running!"
echo "Frontend: http://$HOSTNAME"
echo "Backend: http://$HOSTNAME/api/" 