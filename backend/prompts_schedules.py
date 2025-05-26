import os
import pandas as pd
import json
import pytz
from datetime import datetime
from itertools import product
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from gateway.email_api import send_email
from gateway.llm_api import get_ai_response
import logging
import re

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
            standard_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            if days:
                trigger_kwargs['day_of_week'] = ','.join(str(standard_days.index(day)) for day in days)
        
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
        logger.info(f"Successfully scheduled job {job_id}, {trigger_kwargs}")
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

def extract_variables(text: str) -> set[str]:
    """Extract variables from text using {{variable}} pattern"""
    matches = re.findall(r'{{([^}]+)}}', text)
    return set(matches)

def generate_combinations(prompt: str, email_title: str, prompt_variables: dict) -> list[tuple[str, str, dict]]:
    """Generate all possible combinations of prompt and email title variables
    Returns:
        List of tuples (formatted_prompt, formatted_title, used_values_dict)
    """
    # Extract variables from both prompt and title
    prompt_vars = extract_variables(prompt)
    title_vars = extract_variables(email_title)
    all_vars = prompt_vars.union(title_vars)
    
    # Get all variable names and their possible values
    # Only include variables that are actually used in either prompt or title
    var_names = [name for name in prompt_variables.keys() if name in all_vars]
    var_values = [prompt_variables[name] for name in var_names]
    
    # Generate all possible combinations
    combinations = []
    for values in product(*var_values):
        # Create a dictionary of the current combination
        current_values = dict(zip(var_names, values))
        
        # Format both prompt and title with current values
        formatted_prompt = prompt
        formatted_title = email_title
        for var_name, value in current_values.items():
            if var_name in prompt_vars:
                formatted_prompt = formatted_prompt.replace(f"{{{{{var_name}}}}}", value)
            if var_name in title_vars:
                formatted_title = formatted_title.replace(f"{{{{{var_name}}}}}", value)
            
        combinations.append((formatted_prompt, formatted_title, current_values))
    
    return combinations

def execute_prompt(schedule_data):
    """Execute a scheduled prompt for all variable combinations"""
    try:
        logger.info(f"Executing prompt for schedule {schedule_data['id']}, {schedule_data['prompt']}")
        
        # Generate all prompt and title combinations
        combinations = generate_combinations(
            schedule_data['prompt'],
            schedule_data['email_title'],
            schedule_data['prompt_variables']
        )
        
        logger.info(f"Generated {len(combinations)} combinations for schedule {schedule_data['id']}")
        
        # Process each combination
        for formatted_prompt, formatted_title, used_values in combinations:
            try:
                # Get AI response with citations
                response_content, citations = get_ai_response(formatted_prompt)
                
                # Create email body with prompt, response, and citations in Markdown format
                email_body = f"""## Prompt Template\n{schedule_data['prompt']}\n\n## Email Title Template\n{schedule_data['email_title']}\n\n## Prompt Variables\n"""
                # Add used variable values
                for var_name, value in used_values.items():
                    email_body += f"- **{var_name}**: {value}\n"
                
                email_body += f"\n## Prompt\n{formatted_prompt}\n\n## Response\n{response_content}"

                if citations:
                    email_body += f"\n{citations}"
                
                # Send email with formatted title
                send_email(
                    schedule_data['emails'],
                    formatted_title,
                    email_body
                )
                logger.info(f"Successfully sent email for combination {used_values} of schedule {schedule_data['id']}")
                
            except Exception as e:
                logger.error(f"Error processing combination {used_values} for schedule {schedule_data['id']}: {str(e)}")
                continue  # Continue with next combination even if one fails
                
        logger.info(f"Completed processing all combinations for schedule {schedule_data['id']}")
        
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
