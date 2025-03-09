# config.py
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Configuration for the Email Prioritizer application"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or os.urandom(24)
    DEBUG = os.environ.get('FLASK_DEBUG', 'False') == 'True'
    
    # Email configuration
    EMAIL_ADDRESS = os.environ.get('EMAIL_ADDRESS')
    EMAIL_PASSWORD = os.environ.get('EMAIL_PASSWORD')
    IMAP_SERVER = os.environ.get('IMAP_SERVER', 'imap.gmail.com')
    
    # Agent configuration
    CHECK_INTERVAL = int(os.environ.get('CHECK_INTERVAL', '15'))  # minutes