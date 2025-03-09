# app/models/classifier.py
import pickle
import os
import re
import numpy as np
import spacy
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from email.parser import BytesParser
from email.policy import default

class EmailClassifier:
    def __init__(self):
        self.nlp = spacy.load('en_core_web_sm')
        self.model_file = "data/email_classifier_model.pkl"
        self.vectorizer_file = "data/tfidf_vectorizer.pkl"
        self.model = None
        self.vectorizer = None
        
        # Load model if it exists
        if os.path.exists(self.model_file) and os.path.exists(self.vectorizer_file):
            self.load_model()
        else:
            # Initialize new model
            self.vectorizer = TfidfVectorizer(max_features=5000)
            self.model = MultinomialNB()
    
    def preprocess_text(self, text):
        """Clean and preprocess text from emails"""
        if not text or not isinstance(text, str):
            return ""
            
        # Convert to lowercase
        text = text.lower()
        
        # Remove email addresses
        text = re.sub(r'\S*@\S*\s?', '', text)
        
        # Remove URLs
        text = re.sub(r'http\S+', '', text)
        
        # Remove special characters and numbers
        text = re.sub(r'[^\w\s]', '', text)
        text = re.sub(r'\d+', '', text)
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Use spaCy for lemmatization
        doc = self.nlp(text)
        lemmatized_text = " ".join([token.lemma_ for token in doc if not token.is_stop])
        
        return lemmatized_text
    
    def extract_email_features(self, email_data):
        """Extract relevant features from an email message"""
        try:
            # Parse raw email
            parser = BytesParser(policy=default)
            email_message = parser.parsebytes(email_data)
            
            # Extract basic metadata
            from_address = email_message.get('From', '')
            subject = email_message.get('Subject', '')
            to_address = email_message.get('To', '')
            cc_address = email_message.get('Cc', '')
            
            # Flag indicators
            is_reply = 'Re:' in subject
            is_forward = 'Fwd:' in subject
            has_cc = bool(cc_address)
            
            # Get email body
            if email_message.is_multipart():
                body = ''
                for part in email_message.iter_parts():
                    if part.get_content_type() == 'text/plain':
                        body += part.get_content()
            else:
                body = email_message.get_content()
            
            # Preprocess text
            cleaned_subject = self.preprocess_text(subject)
            cleaned_body = self.preprocess_text(body)
            
            # Combine features
            full_text = f"{cleaned_subject} {cleaned_body}"
            
            # Create feature dictionary for additional metadata
            metadata = {
                'is_reply': is_reply,
                'is_forward': is_forward,
                'has_cc': has_cc,
                'from_address': from_address,
                'to_address': to_address
            }
            
            return full_text, metadata
            
        except Exception as e:
            print(f"Error extracting features: {e}")
            return "", {}
    
    def train(self, labeled_emails):
        """Train the email classifier model
        
        Args:
            labeled_emails: List of tuples (email_data, priority_label)
                where priority_label is one of ["urgent", "important", "routine", "low"]
        """
        processed_texts = []
        labels = []
        
        for email_data, label in labeled_emails:
            text, _ = self.extract_email_features(email_data)
            processed_texts.append(text)
            labels.append(label)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            processed_texts, labels, test_size=0.2, random_state=42
        )
        
        # Create and train pipeline
        X_train_tfidf = self.vectorizer.fit_transform(X_train)
        self.model.fit(X_train_tfidf, y_train)
        
        # Evaluate
        X_test_tfidf = self.vectorizer.transform(X_test)
        accuracy = self.model.score(X_test_tfidf, y_test)
        print(f"Model accuracy: {accuracy:.2f}")
        
        # Save the model
        self.save_model()
        
        return accuracy
    
    def predict(self, email_data):
        """Predict the priority of an email
        
        Args:
            email_data: Raw email data
            
        Returns:
            Dictionary with prediction results
        """
        if not self.model or not self.vectorizer:
            raise ValueError("Model not trained or loaded")
        
        text, metadata = self.extract_email_features(email_data)
        
        # If empty text, return low priority
        if not text:
            return {"priority": "low", "confidence": 1.0, "metadata": metadata}
        
        # Transform text
        text_tfidf = self.vectorizer.transform([text])
        
        # Get prediction and probabilities
        prediction = self.model.predict(text_tfidf)[0]
        probabilities = self.model.predict_proba(text_tfidf)[0]
        confidence = max(probabilities)
        
        # Implement some business rules to augment the ML model
        # These might be refined based on user feedback
        if "urgent" in text.lower() or "asap" in text.lower() or "emergency" in text.lower():
            prediction = "urgent"
            confidence = max(confidence, 0.8)
        
        return {
            "priority": prediction,
            "confidence": float(confidence),
            "metadata": metadata
        }
    
    def save_model(self):
        """Save model to disk"""
        os.makedirs("data", exist_ok=True)
        with open(self.model_file, 'wb') as f:
            pickle.dump(self.model, f)
        
        with open(self.vectorizer_file, 'wb') as f:
            pickle.dump(self.vectorizer, f)
    
    def load_model(self):
        """Load model from disk"""
        with open(self.model_file, 'rb') as f:
            self.model = pickle.load(f)
        
        with open(self.vectorizer_file, 'rb') as f:
            self.vectorizer = pickle.load(f)

# Create a simple training data generator for initial model
def generate_sample_training_data():
    """Generate simple sample data for initial training"""
    from email.message import EmailMessage
    import random
    
    # Templates for different priority levels
    templates = {
        "urgent": [
            "URGENT: {topic} needs immediate attention",
            "Emergency: {topic} situation requires action",
            "Critical: {topic} issue - response needed ASAP",
            "Action Required NOW: {topic}",
            "PRIORITY: {topic} situation developing"
        ],
        "important": [
            "Important: {topic} update",
            "Please review: {topic} document",
            "Update on {topic} project",
            "Meeting about {topic} tomorrow",
            "Feedback needed on {topic}"
        ],
        "routine": [
            "Weekly {topic} report",
            "FYI: {topic} news",
            "Team {topic} newsletter",
            "Regular {topic} update",
            "{topic} status check-in"
        ],
        "low": [
            "Invitation: {topic} social event",
            "Newsletter: {topic} monthly digest",
            "Just sharing: {topic} article you might like",
            "{topic} promotional offer",
            "FYI: {topic} minor update"
        ]
    }
    
    # Topics to use in templates
    topics = [
        "project", "server", "client meeting", "budget", 
        "deadline", "report", "application", "marketing",
        "sales", "team building", "office", "HR", "IT",
        "customer feedback", "website", "social media"
    ]
    
    # Generate emails
    training_data = []
    for priority, templates_list in templates.items():
        for _ in range(50):  # 50 samples per priority
            topic = random.choice(topics)
            template = random.choice(templates_list)
            subject = template.format(topic=topic)
            
            # Create email content
            body_length = random.randint(3, 10)  # Number of sentences
            body = ' '.join([f"This is a sample sentence about {topic}." for _ in range(body_length)])
            
            # Create email message
            msg = EmailMessage()
            msg['Subject'] = subject
            msg['From'] = f"person{random.randint(1,10)}@example.com"
            msg['To'] = "you@example.com"
            msg.set_content(body)
            
            # Add to training data
            training_data.append((msg.as_bytes(), priority))
    
    return training_data