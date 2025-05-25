#!/bin/bash

# Update system packages
sudo apt-get update
sudo apt-get install -y python3-venv nodejs npm nginx

# Create backend virtual environment and install dependencies
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate

# Create backend .env example if it doesn't exist
if [ ! -f .env ]; then
    cp env_examples/backend.env.example backend/.env
fi
cd ..

# Install frontend dependencies and build
cd frontend
npm install

# Create frontend .env example if it doesn't exist
if [ ! -f .env ]; then
    cp env_examples/frontend.env.example frontend/.env
fi
cd ..

# Configure nginx
sudo tee /etc/nginx/sites-available/promptcron <<'EOL'
server {
    listen 80;
    server_name $HOSTNAME;

    root /var/www/promptcron;
    index index.html;

    # Increase max upload size for all requests
    client_max_body_size 50M;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend reverse proxy
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Optional: WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        client_max_body_size 50M;
    }

    # Optional: Proxy buffer configuration
    proxy_buffers 16 16k;
    proxy_buffer_size 16k;
}
EOL

# Create web root directory
sudo mkdir -p /var/www/promptcron
sudo chown -R $USER:$USER /var/www/promptcron

# Enable site and restart nginx
sudo ln -sf /etc/nginx/sites-available/promptcron /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

echo "Setup completed successfully!"
echo "Please copy .env.example to .env in both frontend and backend directories and update the values." 