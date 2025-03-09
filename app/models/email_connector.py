# app/models/email_connector.py
import imaplib
import email
import os
from email.header import decode_header
import datetime
import time
from dotenv import load_dotenv

class EmailConnector:
    def __init__(self, email_address=None, password=None, imap_server=None):
        """Initialize email connector
        
        Args:
            email_address: Email address to connect with
            password: Email password or app password
            imap_server: IMAP server address
        """
        load_dotenv()
        
        # Use provided credentials or load from environment variables
        self.email_address = email_address or os.getenv("EMAIL_ADDRESS")
        self.password = password or os.getenv("EMAIL_PASSWORD")
        self.imap_server = imap_server or os.getenv("IMAP_SERVER", "imap.gmail.com")
        
        # Connection object
        self.connection = None
    
    def connect(self):
        """Establish connection to the email server"""
        if not self.email_address or not self.password:
            raise ValueError("Email credentials not provided")
        
        try:
            # Create an IMAP4 object with SSL
            self.connection = imaplib.IMAP4_SSL(self.imap_server)
            
            # Login to account
            self.connection.login(self.email_address, self.password)
            
            return True
        except Exception as e:
            print(f"Connection error: {e}")
            return False
    
    def disconnect(self):
        """Close the email connection"""
        if self.connection:
            try:
                self.connection.close()
                self.connection.logout()
            except:
                pass
            self.connection = None
    
    def fetch_emails(self, folder="INBOX", limit=20, days_back=3):
        """Fetch recent emails from specified folder
        
        Args:
            folder: Email folder to fetch from
            limit: Maximum number of emails to fetch
            days_back: Fetch emails from the last X days
            
        Returns:
            List of email data (raw bytes)
        """
        if not self.connection:
            if not self.connect():
                return []
        
        emails = []
        try:
            # Select the folder
            status, messages = self.connection.select(folder)
            if status != 'OK':
                print(f"Error selecting folder: {folder}")
                return []
            
            # Calculate date for filtering
            date = (datetime.datetime.now() - datetime.timedelta(days=days_back)).strftime("%d-%b-%Y")
            
            # Search for emails from the specified date
            status, message_ids = self.connection.search(None, f'SINCE {date}')
            if status != 'OK':
                print("Error searching for messages")
                return []
            
            # Get message IDs
            message_id_list = message_ids[0].split()
            
            # Fetch the most recent emails up to the limit
            start_idx = max(0, len(message_id_list) - limit)
            for i in range(len(message_id_list) - 1, start_idx - 1, -1):
                msg_id = message_id_list[i]
                status, msg_data = self.connection.fetch(msg_id, '(RFC822)')
                if status != 'OK':
                    continue
                
                emails.append(msg_data[0][1])  # Raw email data
                
                # Sleep briefly to avoid overwhelming the server
                time.sleep(0.1)
            
            return emails
        
        except Exception as e:
            print(f"Error fetching emails: {e}")
            return []
        finally:
            # Don't disconnect after each fetch as we might reuse the connection
            pass
    
    def mark_email(self, email_id, flag):
        """Mark an email with a specific flag
        
        Args:
            email_id: ID of the email to mark
            flag: Flag to set (e.g., '\\Flagged', '\\Seen')
            
        Returns:
            Boolean indicating success
        """
        if not self.connection:
            if not self.connect():
                return False
        
        try:
            status, response = self.connection.store(email_id, '+FLAGS', flag)
            return status == 'OK'
        except Exception as e:
            print(f"Error marking email: {e}")
            return False
    
    def create_folder_if_not_exists(self, folder_name):
        """Create a folder if it doesn't exist
        
        Args:
            folder_name: Name of the folder to create
            
        Returns:
            Boolean indicating success
        """
        if not self.connection:
            if not self.connect():
                return False
        
        try:
            # Check if folder exists
            status, response = self.connection.list('', folder_name)
            if status == 'OK' and response[0]:
                return True  # Folder exists
            
            # Create folder
            status, response = self.connection.create(folder_name)
            return status == 'OK'
        except Exception as e:
            print(f"Error creating folder: {e}")
            return False
    
    def move_email(self, email_id, destination_folder):
        """Move an email to a different folder
        
        Args:
            email_id: ID of the email to move
            destination_folder: Destination folder name
            
        Returns:
            Boolean indicating success
        """
        if not self.connection:
            if not self.connect():
                return False
        
        try:
            # Create folder if it doesn't exist
            self.create_folder_if_not_exists(destination_folder)
            
            # Copy the message to destination folder
            status, response = self.connection.copy(email_id, destination_folder)
            if status != 'OK':
                return False
            
            # Mark the original message for deletion
            status, response = self.connection.store(email_id, '+FLAGS', '\\Deleted')
            if status != 'OK':
                return False
            
            # Expunge to actually delete
            self.connection.expunge()
            
            return True
        except Exception as e:
            print(f"Error moving email: {e}")
            return False
    
    def get_email_id_by_message_id(self, message_id, folder="INBOX"):
        """Get email UID by Message-ID header
        
        Args:
            message_id: Message-ID header value
            folder: Folder to search in
            
        Returns:
            Email UID or None
        """
        if not self.connection:
            if not self.connect():
                return None
        
        try:
            # Select the folder
            status, messages = self.connection.select(folder)
            if status != 'OK':
                return None
            
            # Search for the message by Message-ID
            status, message_ids = self.connection.search(None, f'HEADER Message-ID "{message_id}"')
            if status != 'OK' or not message_ids[0]:
                return None
            
            # Return the first matching ID
            return message_ids[0].split()[0]
        except Exception as e:
            print(f"Error getting email ID: {e}")
            return None