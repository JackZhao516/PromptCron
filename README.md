# PromptCron

PromptCron is a web application for scheduling AI prompts to be sent via email. It allows you to create and manage scheduled prompts with variable support, multiple recipients, and flexible scheduling options.

## Features

- 📅 Flexible scheduling (daily/weekly)
- 📧 Multiple email recipient support
- 🌍 Timezone selection
- 📝 Prompt templates with variable support ({{variable_name}})
- 🔍 Search and filtering capabilities
- 🎯 Form validation and error handling
- 🔔 Toast notifications

## Prerequisites

- Python 3.7+
- Node.js 14+
- npm or yarn
- SMTP server access (e.g., Gmail)
- OpenAI API key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/PromptCron.git
cd PromptCron
```

2. Run the setup script:
```bash
chmod +x setup.sh
./setup.sh
```

The setup script will:
- Install system dependencies
- Set up Python virtual environment
- Install backend dependencies
- Install frontend dependencies
- Configure nginx (if running in production)
- Create example environment files

## Environment Configuration

### Backend Configuration

Copy the example environment file and update it with your settings:

```bash
cp env_examples/backend.env.example backend/.env
```

Update the following variables in `backend/.env`:

```env
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Email Configuration
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_specific_password

# Server Configuration
HOST=0.0.0.0
PORT=8000

# CORS Settings (update in production)
ALLOWED_ORIGINS=http://localhost:3000
# ALLOWED_ORIGINS=http://your-domain.com
```

### Frontend Configuration

Copy the example environment file and update it with your settings:

```bash
cp env_examples/frontend.env.example frontend/.env
```

Update the following variables in `frontend/.env`:

```env
# Development
REACT_APP_API_URL=http://localhost:8000/api

# Production (uncomment and update with your domain)
# REACT_APP_API_URL=http://your-domain.com/api
```

## Running the Application

### Development Mode

1. Start the backend server:
```bash
cd backend
source venv/bin/activate
python app.py
```

2. In a new terminal, start the frontend development server:
```bash
cd frontend
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api

### Production Mode

Run the deployment script:
```bash
chmod +x run.sh
./run.sh
```

The application will be available at:
- Frontend: http://your-domain.com
- Backend API: http://your-domain.com/api

## Usage

1. **Creating a Schedule**
   - Click "New Schedule" button
   - Enter recipient email(s)
   - Create your prompt template with variables using {{variable_name}} syntax
   - Set schedule type (daily/weekly)
   - Select time and timezone
   - Add variables and their values
   - Save the schedule

2. **Managing Schedules**
   - View all schedules in the main dashboard
   - Search schedules by email or title
   - Sort schedules by title
   - Delete schedules as needed

## Troubleshooting

1. **Port 3000 Already in Use**
   - Accept the prompt to use a different port
   - Or kill the existing process and restart

2. **Email Not Sending**
   - Verify SMTP credentials in backend/.env
   - For Gmail, ensure "Less secure app access" is enabled or use App Password

3. **CORS Issues**
   - Check ALLOWED_ORIGINS in backend/.env matches your frontend URL
   - Ensure both frontend and backend are running

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the BSD 3-Clause License - see the LICENSE file for details.