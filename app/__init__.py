# app/__init__.py
from flask import Flask
import os

# Create the Flask application instance
app = Flask(__name__)

# Configure the application from config.py
app.config.from_object('config.Config')

# Secret key for session management and CSRF protection
app.secret_key = os.environ.get('SECRET_KEY') or os.urandom(24)

# Import routes after app is created to avoid circular imports
from app import routes