# app/models/email_agent.py
import os
import json
import datetime
from collections import defaultdict
from app.models.classifier import EmailClassifier
from app.models.email_connector import EmailConnector
from email.parser import BytesParser
from email.policy import default

class EmailPrioritizerAgent:
    def __init__(self):
        """Initialize the Email Prioritizer Agent"""
        self.classifier = EmailClassifier()
        self.email_connector = EmailConnector()
        
        # Load user preferences if available
        self.preferences = self._load_preferences()
        
        # Initialize processed emails cache
        self.processed_emails = set()
        self._load_processed_emails()
        
        # Initialize daily summary data
        self.daily_summary = defaultdict(list)
    
    def _load_preferences(self):
        """Load user preferences from file"""
        preferences_file = "data/user_preferences.json"
        default_preferences = {
            "check_interval_minutes": 15,
            "folders": {
                "urgent": "URGENT",
                "important": "IMPORTANT",
                "routine": "ROUTINE",
                "low": "LOW-PRIORITY"
            },
            "vip_senders": [],
            "auto_categorize": True,
            "notification_preferences": {
                "urgent": True,
                "important": True,
                "routine": False,
                "low": False
            },
            "priority_keywords": {
                "urgent": ["urgent", "asap", "emergency", "critical", "immediate"],
                "important": ["important", "priority", "attention", "review", "required"],
                "low": ["newsletter", "promotion", "offer", "subscription", "digest"]
            }
        }
        
        try:
            if os.path.exists(preferences_file):
                with open(preferences_file, 'r') as f:
                    return json.load(f)
            else:
                # Create default preferences file
                os.makedirs("data", exist_ok=True)
                with open(preferences_file, 'w') as f:
                    json.dump(default_preferences, f, indent=2)
                return default_preferences
        except Exception as e:
            print(f"Error loading preferences: {e}")
            return default_preferences
    
    def _save_preferences(self):
        """Save user preferences to file"""
        preferences_file = "data/user_preferences.json"
        try:
            os.makedirs("data", exist_ok=True)
            with open(preferences_file, 'w') as f:
                json.dump(self.preferences, f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving preferences: {e}")
            return False
    
    def _load_processed_emails(self):
        """Load list of already processed emails"""
        processed_file = "data/processed_emails.json"
        try:
            if os.path.exists(processed_file):
                with open(processed_file, 'r') as f:
                    data = json.load(f)
                    self.processed_emails = set(data.get("processed", []))
        except Exception as e:
            print(f"Error loading processed emails: {e}")
    
    def _save_processed_emails(self):
        """Save list of processed emails"""
        processed_file = "data/processed_emails.json"
        try:
            # Limit the size of processed emails to prevent unlimited growth
            processed_list = list(self.processed_emails)
            if len(processed_list) > 1000:
                processed_list = processed_list[-1000:]
                self.processed_emails = set(processed_list)
                
            os.makedirs("data", exist_ok=True)
            with open(processed_file, 'w') as f:
                json.dump({"processed": processed_list}, f)
        except Exception as e:
            print(f"Error saving processed emails: {e}")
    
    def update_preferences(self, new_preferences):
        """Update user preferences
        
        Args:
            new_preferences: Dictionary with new preference values
            
        Returns:
            Boolean indicating success
        """
        try:
            # Update preferences
            for key, value in new_preferences.items():
                if key in self.preferences:
                    self.preferences[key] = value
            
            # Save updated preferences
            return self._save_preferences()
        except Exception as e:
            print(f"Error updating preferences: {e}")
            return False
    
    def add_vip_sender(self, email_address):
        """Add a sender to the VIP list
        
        Args:
            email_address: Email address to add to VIP list
            
        Returns:
            Boolean indicating success
        """
        try:
            if email_address not in self.preferences["vip_senders"]:
                self.preferences["vip_senders"].append(email_address)
                return self._save_preferences()
            return True
        except Exception as e:
            print(f"Error adding VIP sender: {e}")
            return False
    
    def remove_vip_sender(self, email_address):
        """Remove a sender from the VIP list
        
        Args:
            email_address: Email address to remove from VIP list
            
        Returns:
            Boolean indicating success
        """
        try:
            if email_address in self.preferences["vip_senders"]:
                self.preferences["vip_senders"].remove(email_address)
                return self._save_preferences()
            return True
        except Exception as e:
            print(f"Error removing VIP sender: {e}")
            return False
    
    def _extract_message_id(self, email_data):
        """Extract Message-ID from email
        
        Args:
            email_data: Raw email data
            
        Returns:
            Message-ID string or None
        """
        try:
            parser = BytesParser(policy=default)
            email_message = parser.parsebytes(email_data)
            message_id = email_message.get("Message-ID", None)
            return message_id
        except Exception as e:
            print(f"Error extracting Message-ID: {e}")
            return None
    
    def _adjust_priority_with_rules(self, prediction, metadata):
        """Apply business rules to adjust the priority
        
        Args:
            prediction: Initial prediction from the classifier
            metadata: Email metadata
            
        Returns:
            Adjusted priority
        """
        priority = prediction["priority"]
        from_address = metadata.get("from_address", "")
        
        # VIP sender rule
        for vip in self.preferences["vip_senders"]:
            if vip in from_address:
                if priority == "low" or priority == "routine":
                    return "important"
                elif priority == "important":
                    return "urgent"
        
        # Keyword based rules
        subject = metadata.get("subject", "").lower()
        for keyword in self.preferences["priority_keywords"]["urgent"]:
            if keyword in subject:
                return "urgent"
                
        for keyword in self.preferences["priority_keywords"]["important"]:
            if keyword in subject and priority == "routine":
                return "important"
                
        for keyword in self.preferences["priority_keywords"]["low"]:
            if keyword in subject and priority != "urgent" and priority != "important":
                return "low"
        
        return priority
    
    def check_emails(self):
        """Check for new emails and categorize them
        
        Returns:
            Dictionary with results summary
        """
        results = {
            "processed": 0,
            "by_priority": {
                "urgent": 0,
                "important": 0,
                "routine": 0,
                "low": 0
            },
            "errors": 0
        }
        
        try:
            # Connect to email
            if not self.email_connector.connect():
                return {"error": "Failed to connect to email server"}
            
            # Fetch recent emails
            emails = self.email_connector.fetch_emails(
                limit=30,  # Process up to 30 emails at a time
                days_back=1  # Focus on last day's emails
            )
            
            # Process each email
            for email_data in emails:
                try:
                    # Extract Message-ID to prevent reprocessing
                    message_id = self._extract_message_id(email_data)
                    if not message_id or message_id in self.processed_emails:
                        continue
                    
                    # Add to processed set
                    self.processed_emails.add(message_id)
                    
                    # Classify email
                    prediction = self.classifier.predict(email_data)
                    
                    # Apply business rules to adjust priority
                    metadata = prediction.get("metadata", {})
                    adjusted_priority = self._adjust_priority_with_rules(prediction, metadata)
                    
                    # Record in results
                    results["processed"] += 1
                    results["by_priority"][adjusted_priority] += 1
                    
                    # Add to daily summary
                    self._add_to_daily_summary(email_data, adjusted_priority)
                    
                    # Move to appropriate folder if auto-categorize is enabled
                    if self.preferences["auto_categorize"]:
                        folder_name = self.preferences["folders"].get(adjusted_priority)
                        if folder_name:
                            # Get email UID to move
                            email_uid = self.email_connector.get_email_id_by_message_id(message_id)
                            if email_uid:
                                self.email_connector.move_email(email_uid, folder_name)
                    
                except Exception as e:
                    print(f"Error processing email: {e}")
                    results["errors"] += 1
            
            # Save processed emails list
            self._save_processed_emails()
            
            return results
            
        except Exception as e:
            print(f"Error checking emails: {e}")
            return {"error": str(e)}
        finally:
            # Disconnect from email server
            self.email_connector.disconnect()
    
    def _add_to_daily_summary(self, email_data, priority):
        """Add an email to the daily summary
        
        Args:
            email_data: Raw email data
            priority: Assigned priority
        """
        try:
            parser = BytesParser(policy=default)
            email_message = parser.parsebytes(email_data)
            
            # Extract basic metadata
            subject = email_message.get('Subject', 'No Subject')
            from_address = email_message.get('From', 'Unknown')
            date_received = email_message.get('Date', datetime.datetime.now().strftime("%a, %d %b %Y %H:%M:%S"))
            
            # Add to summary by priority
            self.daily_summary[priority].append({
                "subject": subject,
                "from": from_address,
                "date": date_received
            })
        except Exception as e:
            print(f"Error adding to daily summary: {e}")
    
    def get_daily_summary(self):
        """Get the daily email summary
        
        Returns:
            Dictionary with summary by priority
        """
        return dict(self.daily_summary)
    
    def reset_daily_summary(self):
        """Reset the daily summary data"""
        self.daily_summary = defaultdict(list)
    
    def provide_feedback(self, message_id, correct_priority):
        """Provide feedback to improve the classifier
        
        Args:
            message_id: Message-ID of the email
            correct_priority: The correct priority for this email
            
        Returns:
            Boolean indicating success
        """
        # This is a placeholder for the feedback mechanism
        # In a real implementation, you would:
        # 1. Fetch the email by message_id
        # 2. Add it to a training dataset with the correct label
        # 3. Periodically retrain the model with this feedback data
        
        # For now, we'll just return success
        return True