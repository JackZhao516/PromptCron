from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import prompts_schedules
import os
from utils.decorators import log_request_response, init_logging
from datetime import datetime
import re
import logging

# Load environment variables
load_dotenv()
init_logging()
logger = logging.getLogger('promptcron')

app = Flask(__name__)

# Configure CORS
CORS(app, resources={
    r"/api/*": {
        "origins": "*",  # Allow all origins in development
        "methods": ["GET", "POST", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Type"],
        "supports_credentials": False
    }
})

# Production configuration
app.config['ENV'] = 'production'
app.config['DEBUG'] = False
app.config['TESTING'] = False

# Ensure schedules file exists
prompts_schedules.ensure_csv_exists()
logger.info("Loading existing schedules")
prompts_schedules.load_existing_schedules()

def extract_variables(text: str) -> list[str]:
    """Extract variables from text using {{variable}} pattern"""
    matches = re.findall(r'{{([^}]+)}}', text)
    return matches

@app.route('/api/schedules', methods=['GET'])
@log_request_response
def get_schedules():
    """Get all schedules"""
    try:
        schedules = prompts_schedules.get_all_schedules()
        return jsonify(schedules)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/schedules', methods=['POST'])
@log_request_response
def create_schedule():
    """Create a new schedule"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['id', 'emails', 'prompt', 'email_title', 'schedule']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Extract variables from prompt and email title
        prompt_vars = extract_variables(data['prompt'])
        title_vars = extract_variables(data['email_title'])
        all_vars = list(set(prompt_vars + title_vars))

        # If variables are found, validate prompt_variables
        if all_vars and (not data.get('prompt_variables') or not isinstance(data['prompt_variables'], dict)):
            return jsonify({'error': 'prompt_variables must be a non-empty object when using variables'}), 400
            
        # Validate all variables have values
        if all_vars:
            missing_vars = [var for var in all_vars if var not in data['prompt_variables'] or not data['prompt_variables'][var]]
            if missing_vars:
                return jsonify({'error': f'Missing values for variables: {", ".join(missing_vars)}'}), 400
        else:
            # No variables found, set empty prompt_variables if not provided
            data['prompt_variables'] = {}

        # Remove duplicate emailTitle if present
        if 'emailTitle' in data:
            del data['emailTitle']
        
        # Validate schedule fields
        schedule = data['schedule']
        if not all(key in schedule for key in ['type', 'time', 'timezone']):
            return jsonify({'error': 'Schedule must include type, time, and timezone'}), 400
        
        # Validate schedule type
        if schedule['type'] not in ['daily', 'weekly']:
            return jsonify({'error': 'Schedule type must be either daily or weekly'}), 400
        
        # Validate time format (HH:MM)
        try:
            hour, minute = schedule['time'].split(':')
            if not (0 <= int(hour) <= 23 and 0 <= int(minute) <= 59):
                raise ValueError
        except ValueError:
            return jsonify({'error': 'Invalid time format. Use HH:MM (24-hour format)'}), 400
        
        # Validate weekly schedule days
        if schedule['type'] == 'weekly':
            if 'days' not in schedule or not schedule['days']:
                return jsonify({'error': 'Weekly schedule must include days'}), 400
            valid_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            if not all(day.lower() in valid_days for day in schedule['days']):
                return jsonify({'error': 'Invalid days in weekly schedule'}), 400
        
        # Validate dates if provided
        if 'start_date' in data and data['start_date']:
            try:
                start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
                data['start_date'] = start_date.isoformat()
            except ValueError:
                return jsonify({'error': 'Invalid start_date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)'}), 400
        
        if 'end_date' in data and data['end_date']:
            try:
                end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
                data['end_date'] = end_date.isoformat()
            except ValueError:
                return jsonify({'error': 'Invalid end_date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)'}), 400
            
            # Validate end_date is after start_date
            if 'start_date' in data and data['start_date']:
                if end_date <= start_date:
                    return jsonify({'error': 'end_date must be after start_date'}), 400
        
        new_schedule = prompts_schedules.add_schedule(data)
            
        return jsonify(new_schedule), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/schedules/<schedule_id>', methods=['DELETE'])
@log_request_response
def delete_schedule(schedule_id):
    """Delete a schedule"""
    try:
        success = prompts_schedules.delete_schedule(schedule_id)
        if success:
            return jsonify({'message': 'Schedule deleted successfully'}), 200
        return jsonify({'error': 'Schedule not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Production WSGI entry point
application = app

if __name__ == '__main__':
    # This block will only be entered if running directly with python app.py
    # In production, use gunicorn instead
    logger.info("Warning: Running in development mode. Use gunicorn for production.")
    host = os.getenv('HOST', '0.0.0.0')
    port = int(os.getenv('PORT', '8000'))
    app.run(host=host, port=port)
