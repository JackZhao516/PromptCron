import functools
import json
import logging
import os
from datetime import datetime
from logging.handlers import RotatingFileHandler

from flask import request, jsonify, Response


def init_logging():
    """Initialize logging configuration"""
    # Ensure runtime directory exists
    runtime_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'runtime')
    os.makedirs(runtime_dir, exist_ok=True)

    # Configure logging
    logger = logging.getLogger('promptcron')
    if not logger.handlers:  # Only add handler if it doesn't exist
        logger.setLevel(logging.INFO)
        
        # Create formatter
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        
        # Create file handler
        log_file = os.path.join(runtime_dir, 'backend.log')
        file_handler = RotatingFileHandler(log_file, maxBytes=10000000, backupCount=5)
        file_handler.setFormatter(formatter)
        
        # Add handler to logger
        logger.addHandler(file_handler)

def log_request_response(func):
    """Decorator to log request and response details"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        logger = logging.getLogger('promptcron')
        
        # Log request
        request_data = {}
        if request.is_json:
            request_data = request.get_json()
        elif request.form:
            request_data = request.form.to_dict()
        elif request.args:
            request_data = request.args.to_dict()
            
        logger.info(f"Request {request.method} {request.path}: {json.dumps(request_data)}")
        
        # Execute view function
        response = func(*args, **kwargs)
        
        # Log response
        try:
            if isinstance(response, tuple):
                response_data, status_code = response
            else:
                response_data = response
                status_code = 200 if not isinstance(response, Response) else response.status_code

            # Handle different response types
            if isinstance(response_data, Response):
                try:
                    response_data = response_data.get_json()
                except:
                    response_data = {"message": str(response_data)}
            
            # Ensure response_data is JSON serializable
            if not isinstance(response_data, (dict, list, str, int, float, bool, type(None))):
                response_data = {"message": str(response_data)}

            logger.info(f"Response {status_code}: {json.dumps(response_data)}")
        except Exception as e:
            logger.error(f"Error logging response: {str(e)}")
        
        return response
        
    return wrapper 