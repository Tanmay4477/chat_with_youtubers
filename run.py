from app import app
from app.models.classifier import EmailClassifier, generate_sample_training_data

def train_initial_model():
    """Train the initial model with sample data"""
    print("Generating sample training data...")
    training_data = generate_sample_training_data()
    
    print("Training initial model...")
    classifier = EmailClassifier()
    accuracy = classifier.train(training_data)
    print(f"Initial model trained with accuracy: {accuracy:.2f}")

if __name__ == '__main__':
    # Train initial model if not exists
    import os
    if not os.path.exists("data/email_classifier_model.pkl"):
        train_initial_model()
    
    # Run the application
    app.run(debug=True)