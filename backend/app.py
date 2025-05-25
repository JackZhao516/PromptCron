from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import prompts_schedules
import os

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure CORS
allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
CORS(app, resources={
    r"/api/*": {
        "origins": allowed_origins,
        "methods": ["GET", "POST", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Ensure schedules file exists
prompts_schedules.ensure_csv_exists()

@app.route('/api/schedules', methods=['GET'])
def get_schedules():
    """Get all schedules"""
    schedules = prompts_schedules.get_all_schedules()
    return jsonify(schedules)

@app.route('/api/schedules', methods=['POST'])
def create_schedule():
    """Create a new schedule"""
    data = request.json
    result = prompts_schedules.create_schedule(data)
    return jsonify(result)

@app.route('/api/schedules/<schedule_id>', methods=['DELETE'])
def delete_schedule(schedule_id):
    """Delete a schedule"""
    result = prompts_schedules.delete_schedule(schedule_id)
    return jsonify(result)

if __name__ == '__main__':
    host = os.getenv('HOST', '0.0.0.0')
    port = int(os.getenv('PORT', '8000'))
    app.run(host=host, port=port, debug=True)
