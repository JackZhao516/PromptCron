import os
import pandas as pd
import json
import pytz
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from gateway.email import send_email
from gateway.llm import get_ai_response
import logging

# Configure logging
logger = logging.getLogger('promptcron')

# Get schedules file path from environment or use default
SCHEDULES_FILE = os.getenv('SCHEDULES_FILE', '../runtime/schedules.csv')

# Initialize scheduler
scheduler = BackgroundScheduler()
scheduler.start()

def ensure_csv_exists():
    """Ensure the schedules CSV file exists"""
    os.makedirs(os.path.dirname(SCHEDULES_FILE), exist_ok=True)
    if not os.path.exists(SCHEDULES_FILE):
        df = pd.DataFrame(columns=[
            'id', 'emails', 'prompt', 'email_title', 'prompt_variables',
            'schedule_type', 'time', 'timezone', 'days',
            'start_date', 'end_date'
        ])
        df.to_csv(SCHEDULES_FILE, index=False)

def get_all_schedules():
    """Get all schedules from CSV"""
    if not os.path.exists(SCHEDULES_FILE):
        return []
    
    df = pd.read_csv(SCHEDULES_FILE)
    schedules = []
    
    for _, row in df.iterrows():
        schedule = {
            'id': row['id'],
            'emails': json.loads(row['emails']),
            'prompt': row['prompt'],
            'email_title': row['email_title'],
            'prompt_variables': json.loads(row['prompt_variables']),
            'schedule': {
                'type': row['schedule_type'],
                'time': row['time'],
                'timezone': row['timezone'],
            }
        }
        
        # Add days if weekly schedule
        if row['schedule_type'] == 'weekly' and not pd.isna(row['days']):
            schedule['schedule']['days'] = json.loads(row['days'])
            
        # Add start and end dates if they exist
        if not pd.isna(row['start_date']):
            schedule['start_date'] = row['start_date']
        if not pd.isna(row['end_date']):
            schedule['end_date'] = row['end_date']
            
        schedules.append(schedule)
    
    return schedules

def add_schedule(schedule_data):
    """Add a new schedule"""
    ensure_csv_exists()
    
    # Read existing schedules
    df = pd.read_csv(SCHEDULES_FILE)
    
    # Prepare new schedule data
    new_schedule = {
        'id': schedule_data['id'],
        'emails': json.dumps(schedule_data['emails']),
        'prompt': schedule_data['prompt'],
        'email_title': schedule_data['email_title'],
        'prompt_variables': json.dumps(schedule_data['prompt_variables']),
        'schedule_type': schedule_data['schedule']['type'],
        'time': schedule_data['schedule']['time'],
        'timezone': schedule_data['schedule']['timezone'],
        'days': json.dumps(schedule_data['schedule'].get('days', [])),
        'start_date': schedule_data.get('start_date', None),
        'end_date': schedule_data.get('end_date', None)
    }
    
    # Append new schedule
    df = pd.concat([df, pd.DataFrame([new_schedule])], ignore_index=True)
    df.to_csv(SCHEDULES_FILE, index=False)
    
    # Schedule the job
    schedule_job(schedule_data)
    
    return new_schedule

def schedule_job(schedule_data):
    """Schedule a job with APScheduler"""
    try:
        job_id = str(schedule_data['id'])
        schedule_type = schedule_data['schedule']['type']
        time_parts = schedule_data['schedule']['time'].split(':')
        timezone = pytz.timezone(schedule_data['schedule']['timezone'])
        
        # Create trigger kwargs
        trigger_kwargs = {
            'hour': int(time_parts[0]),
            'minute': int(time_parts[1]),
            'timezone': timezone
        }
        
        # Add day of week for weekly schedules
        if schedule_type == 'weekly':
            days = schedule_data['schedule'].get('days', [])
            if days:
                trigger_kwargs['day_of_week'] = ','.join(str(days.index(day)) for day in days)
        
        # Add start and end dates if specified
        if 'start_date' in schedule_data and schedule_data['start_date']:
            trigger_kwargs['start_date'] = datetime.fromisoformat(schedule_data['start_date'])
            logger.info(f"Schedule {job_id} will start at {schedule_data['start_date']}")
            
        if 'end_date' in schedule_data and schedule_data['end_date']:
            trigger_kwargs['end_date'] = datetime.fromisoformat(schedule_data['end_date'])
            logger.info(f"Schedule {job_id} will end at {schedule_data['end_date']}")
        
        # Create and add job
        trigger = CronTrigger(**trigger_kwargs)
        scheduler.add_job(
            execute_prompt,
            trigger=trigger,
            id=job_id,
            replace_existing=True,
            args=[schedule_data]
        )
        logger.info(f"Successfully scheduled job {job_id}")
    except Exception as e:
        logger.error(f"Error scheduling job {schedule_data['id']}: {str(e)}")
        raise

def delete_schedule(schedule_id):
    """Delete a schedule"""
    if not os.path.exists(SCHEDULES_FILE):
        return False
    
    df = pd.read_csv(SCHEDULES_FILE)
    df = df[df['id'] != schedule_id]
    df.to_csv(SCHEDULES_FILE, index=False)
    
    # Remove job from scheduler
    try:
        scheduler.remove_job(str(schedule_id))
        logger.info(f"Successfully deleted schedule {schedule_id}")
    except Exception as e:
        logger.error(f"Error removing job {schedule_id}: {str(e)}")
    
    return True

async def execute_prompt(schedule_data):
    """Execute a scheduled prompt"""
    try:
        # Replace variables in prompt
        prompt = schedule_data['prompt']
        for var_name, values in schedule_data['prompt_variables'].items():
            if values:
                prompt = prompt.replace(f"{{{{{var_name}}}}}", values[0])
        
        # Get AI response
        response = await get_ai_response(prompt)
        
        # Send email
        send_email(
            schedule_data['emails'],
            schedule_data['email_title'],
            response
        )
        logger.info(f"Successfully executed prompt for schedule {schedule_data['id']}")
    except Exception as e:
        logger.error(f"Error executing prompt for schedule {schedule_data['id']}: {str(e)}")

def load_existing_schedules():
    """Load existing schedules from CSV"""
    try:
        logger.info("Loading schedules from CSV file...")
        schedules = get_all_schedules()
        for schedule in schedules:
            try:
                schedule_job(schedule)
            except Exception as e:
                logger.error(f"Failed to schedule job {schedule['id']}: {str(e)}")
        logger.info(f"Successfully loaded and scheduled {len(schedules)} schedules")
    except Exception as e:
        logger.error(f"Error loading schedules from CSV: {str(e)}")

# Load schedules on module import
load_existing_schedules()
