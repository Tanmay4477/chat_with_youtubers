# app/models/gmail_helper.py
import os
import pickle
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request

class GmailHelper:
    """Helper class for Gmail-specific operations"""
    
    # Gmail API scopes
    SCOPES = ['https://www.googleapis.com/auth/gmail.modify']
    
    # Priority label names
    LABEL_NAMES = {
        'urgent': 'Priority/URGENT',
        'important': 'Priority/IMPORTANT',
        'routine': 'Priority/ROUTINE',
        'low': 'Priority/LOW'
    }
    
    def __init__(self):
        """Initialize Gmail helper"""
        self.service = None
        self.credentials_file = 'data/gmail_credentials.json'
        self.token_file = 'data/gmail_token.pickle'
        
    def authenticate(self):
        """Authenticate with Gmail API
        
        Returns:
            Boolean indicating success
        """
        creds = None
        
        # Load existing token if available
        if os.path.exists(self.token_file):
            with open(self.token_file, 'rb') as token:
                creds = pickle.load(token)
        
        # Refresh token if expired
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        # Otherwise, authenticate user
        elif not creds:
            if not os.path.exists(self.credentials_file):
                return False
                
            flow = InstalledAppFlow.from_client_secrets_file(
                self.credentials_file, self.SCOPES)
            creds = flow.run_local_server(port=0)
            
            # Save credentials for future use
            with open(self.token_file, 'wb') as token:
                pickle.dump(creds, token)
        
        # Create Gmail API service
        self.service = build('gmail', 'v1', credentials=creds)
        return True
    
    def is_authenticated(self):
        """Check if authenticated with Gmail API
        
        Returns:
            Boolean indicating if authenticated
        """
        return self.service is not None
    
    def ensure_labels_exist(self):
        """Ensure priority labels exist in Gmail
        
        Returns:
            Boolean indicating success
        """
        if not self.is_authenticated():
            if not self.authenticate():
                return False
        
        try:
            # Get existing labels
            results = self.service.users().labels().list(userId='me').execute()
            existing_labels = results.get('labels', [])
            existing_label_names = [label['name'] for label in existing_labels]
            
            # Create parent label if needed
            if 'Priority' not in existing_label_names:
                label_body = {
                    'name': 'Priority',
                    'labelListVisibility': 'labelShow',
                    'messageListVisibility': 'show'
                }
                self.service.users().labels().create(userId='me', body=label_body).execute()
            
            # Create priority labels if needed
            for priority, label_name in self.LABEL_NAMES.items():
                if label_name not in existing_label_names:
                    label_body = {
                        'name': label_name,
                        'labelListVisibility': 'labelShow',
                        'messageListVisibility': 'show'
                    }
                    self.service.users().labels().create(userId='me', body=label_body).execute()
            
            return True
        except Exception as e:
            print(f"Error ensuring labels exist: {e}")
            return False
    
    def get_label_id(self, label_name):
        """Get Gmail label ID by name
        
        Args:
            label_name: Name of the label
            
        Returns:
            Label ID or None if not found
        """
        if not self.is_authenticated():
            if not self.authenticate():
                return None
        
        try:
            results = self.service.users().labels().list(userId='me').execute()
            labels = results.get('labels', [])
            
            for label in labels:
                if label['name'] == label_name:
                    return label['id']
            
            return None
        except Exception as e:
            print(f"Error getting label ID: {e}")
            return None
    
    def apply_priority_label(self, message_id, priority):
        """Apply priority label to an email
        
        Args:
            message_id: Gmail message ID
            priority: Priority level ('urgent', 'important', 'routine', 'low')
            
        Returns:
            Boolean indicating success
        """
        if not self.is_authenticated():
            if not self.authenticate():
                return False
                
        # Ensure labels exist
        self.ensure_labels_exist()
        
        try:
            # Get label ID
            label_name = self.LABEL_NAMES.get(priority)
            if not label_name:
                return False
                
            label_id = self.get_label_id(label_name)
            if not label_id:
                return False
            
            # Apply label to message
            body = {'addLabelIds': [label_id]}
            self.service.users().messages().modify(
                userId='me', id=message_id, body=body).execute()
            
            return True
        except Exception as e:
            print(f"Error applying priority label: {e}")
            return False
    
    def get_gmail_message_id(self, message_id):
        """Get Gmail message ID from Message-ID header
        
        Args:
            message_id: Email Message-ID header
            
        Returns:
            Gmail message ID or None
        """
        if not self.is_authenticated():
            if not self.authenticate():
                return None
        
        try:
            # Search for message by Message-ID header
            query = f'rfc822msgid:{message_id}'
            results = self.service.users().messages().list(
                userId='me', q=query).execute()
            
            messages = results.get('messages', [])
            if not messages:
                return None
                
            # Return first matching message ID
            return messages[0]['id']
        except Exception as e:
            print(f"Error getting Gmail message ID: {e}")
            return None
    
    def process_email_with_priority(self, message_id, priority):
        """Process an email with priority information
        
        Args:
            message_id: Email Message-ID header
            priority: Priority level
            
        Returns:
            Boolean indicating success
        """
        # Get Gmail message ID
        gmail_id = self.get_gmail_message_id(message_id)
        if not gmail_id:
            return False
            
        # Apply priority label
        return self.apply_priority_label(gmail_id, priority)