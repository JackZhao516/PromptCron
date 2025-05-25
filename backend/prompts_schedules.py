import os
import pandas as pd
import json
import pytz
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from gateway.email import send_email
from gateway.llm import get_ai_response

# CSV file to store schedules
SCHEDULES_FILE = 'schedules.csv'

# Initialize scheduler
scheduler = BackgroundScheduler()
scheduler.start()

def ensure_csv_exists():
    """Ensure the schedules CSV file exists"""
    if not os.path.exists(SCHEDULES_FILE):
        df = pd.DataFrame(columns=['id', 'emails', 'prompt', 'email_title', 'prompt_variables', 'schedule_type', 'time', 'timezone', 'days'])
        df.to_csv(SCHEDULES_FILE, index=False)

def get_all_schedules():
    """Get all schedules from CSV"""
    df = pd.read_csv(SCHEDULES_FILE)
    schedules = []
    for _, row in df.iterrows():
        schedule = {
            'id': row['id'],
            'emails': json.loads(row['emails']),
            'prompt': row['prompt'],
            'emailTitle': row['email_title'],
            'promptVariables': json.loads(row['prompt_variables']),
            'schedule': {
                'type': row['schedule_type'],
                'time': row['time'],
                'timezone': row['timezone']
            }
        }
        if row['days']:
            schedule['schedule']['days'] = json.loads(row['days'])
        schedules.append(schedule)
    return schedules

def create_schedule(data):
    """Create a new schedule"""
    schedule_data = {
        'id': data['id'],
        'emails': json.dumps(data['emails']),
        'prompt': data['prompt'],
        'email_title': data['emailTitle'],
        'prompt_variables': json.dumps(data['promptVariables']),
        'schedule_type': data['schedule']['type'],
        'time': data['schedule']['time'],
        'timezone': data['schedule']['timezone'],
        'days': json.dumps(data['schedule'].get('days', []))
    }
    
    # Add to CSV
    df = pd.read_csv(SCHEDULES_FILE)
    df = pd.concat([df, pd.DataFrame([schedule_data])], ignore_index=True)
    df.to_csv(SCHEDULES_FILE, index=False)
    
    # Create scheduler job
    _create_scheduler_job(data)
    
    return {'message': 'Schedule created successfully'}

def delete_schedule(schedule_id):
    """Delete a schedule"""
    # Remove from CSV
    df = pd.read_csv(SCHEDULES_FILE)
    df = df[df['id'] != schedule_id]
    df.to_csv(SCHEDULES_FILE, index=False)
    
    # Remove from scheduler
    try:
        scheduler.remove_job(schedule_id)
    except:
        pass
    
    return {'message': 'Schedule deleted successfully'}

def _create_scheduler_job(data):
    """Create a scheduler job for the given schedule data"""
    time_parts = data['schedule']['time'].split(':')
    timezone = pytz.timezone(data['schedule']['timezone'])
    
    if data['schedule']['type'] == 'daily':
        trigger = CronTrigger(
            hour=time_parts[0],
            minute=time_parts[1],
            timezone=timezone
        )
    else:  # weekly
        days_of_week = ','.join(data['schedule'].get('days', ['mon']))
        trigger = CronTrigger(
            day_of_week=days_of_week,
            hour=time_parts[0],
            minute=time_parts[1],
            timezone=timezone
        )
    
    scheduler.add_job(
        process_schedule,
        trigger=trigger,
        args=[data['id']],
        id=data['id']
    )

async def process_schedule(schedule_id):
    """Process a scheduled prompt"""
    df = pd.read_csv(SCHEDULES_FILE)
    schedule = df[df['id'] == schedule_id].iloc[0]
    
    # Parse the stored JSON strings
    emails = json.loads(schedule['emails'])
    prompt_variables = json.loads(schedule['prompt_variables'])
    prompt_template = schedule['prompt']
    email_title_template = schedule['email_title']

    # For each combination of variables, create and send a prompt
    for variable_name, values in prompt_variables.items():
        for value in values:
            # Replace template variables with actual values
            prompt = prompt_template.replace(f"{{{{{variable_name}}}}}", value)
            email_title = email_title_template.replace(f"{{{{{variable_name}}}}}", value)
            
            # Get AI response
            response = await get_ai_response(prompt)
            
            # Extract reference links if present in the response
            references = ""
            if "References:" in response:
                main_response, refs = response.split("References:", 1)
                references = f"\n\nReferences:\n{refs.strip()}"
                response = main_response.strip()
            
            # Format email body
            email_body = f"""Prompt: {prompt}

Response: {response}{references}"""
            
            # Send email
            send_email(emails, email_title, email_body)
