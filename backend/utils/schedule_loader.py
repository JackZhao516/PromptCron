import os
import importlib.util
import logging
from typing import List, Dict, Any
from datetime import datetime

logger = logging.getLogger('promptcron')

def load_schedule_file(file_path: str) -> List[Dict[str, Any]]:
    """Load schedule definitions from a Python file"""
    try:
        # Get the module name from the file name
        module_name = os.path.splitext(os.path.basename(file_path))[0]
        
        # Load the module
        spec = importlib.util.spec_from_file_location(module_name, file_path)
        if not spec or not spec.loader:
            logger.error(f"Could not load spec for {file_path}")
            return []
            
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        
        # Get the schedules list
        if not hasattr(module, 'schedules'):
            logger.warning(f"No schedules defined in {file_path}")
            return []
            
        schedules = module.schedules
        if not isinstance(schedules, list):
            logger.error(f"Schedules in {file_path} must be a list")
            return []
            
        # Validate each schedule
        valid_schedules = []
        for schedule in schedules:
            if validate_schedule(schedule):
                # Add file source information
                schedule['source_file'] = file_path
                valid_schedules.append(schedule)
            else:
                logger.error(f"Invalid schedule in {file_path}: {schedule}")
        
        return valid_schedules
    except Exception as e:
        logger.error(f"Error loading schedule file {file_path}: {str(e)}")
        return []

def validate_schedule(schedule: Dict[str, Any]) -> bool:
    """Validate a schedule definition"""
    required_fields = {
        'id': str,
        'emails': list,
        'prompt': str,
        'email_title': str,
        'prompt_variables': dict,
        'schedule': dict
    }
    
    # Check required fields and types
    for field, field_type in required_fields.items():
        if field not in schedule:
            logger.error(f"Missing required field: {field}")
            return False
        if not isinstance(schedule[field], field_type):
            logger.error(f"Invalid type for {field}: expected {field_type}, got {type(schedule[field])}")
            return False
    
    # Validate schedule details
    schedule_data = schedule['schedule']
    if not all(key in schedule_data for key in ['type', 'time', 'timezone']):
        logger.error("Schedule must include type, time, and timezone")
        return False
    
    # Validate schedule type
    if schedule_data['type'] not in ['daily', 'weekly']:
        logger.error(f"Invalid schedule type: {schedule_data['type']}")
        return False
    
    # Validate time format (HH:MM)
    try:
        datetime.strptime(schedule_data['time'], '%H:%M')
    except ValueError:
        logger.error(f"Invalid time format: {schedule_data['time']}")
        return False
    
    # If weekly, validate days
    if schedule_data['type'] == 'weekly':
        valid_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        days = schedule_data.get('days', [])
        if not days or not all(day.lower() in valid_days for day in days):
            logger.error(f"Invalid or missing days for weekly schedule: {days}")
            return False
    
    return True

def load_all_schedules() -> List[Dict[str, Any]]:
    """Load all schedule files from the runtime/schedule.py directory"""
    schedule_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'runtime', 'schedule.py')
    
    # Create directory if it doesn't exist
    os.makedirs(schedule_dir, exist_ok=True)
    
    all_schedules = []
    
    # Load all .py files in the directory
    for file_name in os.listdir(schedule_dir):
        if file_name.endswith('.py'):
            file_path = os.path.join(schedule_dir, file_name)
            schedules = load_schedule_file(file_path)
            all_schedules.extend(schedules)
    
    return all_schedules 