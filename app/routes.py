# # app/routes.py
# from flask import render_template, request, jsonify, redirect, url_for, flash
# from app import app
# from app.models.email_agent import EmailPrioritizerAgent
# import os
# import threading
# import time
# import json

# # Create agent instance
# email_agent = EmailPrioritizerAgent()

# # Background task for periodic checking
# def background_checker():
#     while True:
#         try:
#             # Get check interval from preferences
#             interval_minutes = email_agent.preferences.get("check_interval_minutes", 15)
            
#             # Check emails
#             email_agent.check_emails()
            
#             # Sleep for the interval
#             time.sleep(interval_minutes * 60)
#         except Exception as e:
#             print(f"Error in background checker: {e}")
#             time.sleep(300)  # Sleep for 5 minutes on error

# # Start background thread
# background_thread = threading.Thread(target=background_checker, daemon=True)
# background_thread.start()

# @app.route('/')
# def index():
#     """Main dashboard page"""
#     # Get daily summary
#     summary = email_agent.get_daily_summary()
    
#     # Get preferences
#     preferences = email_agent.preferences
    
#     return render_template('index.html', 
#                           summary=summary, 
#                           preferences=preferences)

# @app.route('/check-now', methods=['POST'])
# def check_now():
#     """Manually trigger email check"""
#     results = email_agent.check_emails()
#     return jsonify(results)

# @app.route('/settings', methods=['GET', 'POST'])
# def settings():
#     """Settings page"""
#     if request.method == 'POST':
#         # Update preferences
#         data = request.form.to_dict()
        
#         # Process form data into preferences structure
#         new_preferences = {
#             "check_interval_minutes": int(data.get("check_interval", 15)),
#             "auto_categorize": data.get("auto_categorize") == "on",
#             "notification_preferences": {
#                 "urgent": data.get("notify_urgent") == "on",
#                 "important": data.get("notify_important") == "on",
#                 "routine": data.get("notify_routine") == "on",
#                 "low": data.get("notify_low") == "on"
#             },
#             "folders": {
#                 "urgent": data.get("folder_urgent", "URGENT"),
#                 "important": data.get("folder_important", "IMPORTANT"),
#                 "routine": data.get("folder_routine", "ROUTINE"),
#                 "low": data.get("folder_low", "LOW-PRIORITY")
#             }
#         }
        
#         # Update VIP senders
#         vip_senders = data.get("vip_senders", "").strip().split("\n")
#         vip_senders = [email.strip() for email in vip_senders if email.strip()]
#         new_preferences["vip_senders"] = vip_senders
        
#         # Update keywords
#         for priority in ["urgent", "important", "low"]:
#             keywords = data.get(f"keywords_{priority}", "").strip().split(",")
#             keywords = [kw.strip().lower() for kw in keywords if kw.strip()]
#             if "priority_keywords" not in new_preferences:
#                 new_preferences["priority_keywords"] = {}
#             new_preferences["priority_keywords"][priority] = keywords
        
#         # Update preferences
#         email_agent.update_preferences(new_preferences)
#         flash("Settings updated successfully", "success")
#         return redirect(url_for('settings'))
    
#     # GET request - show settings page
#     return render_template('settings.html', preferences=email_agent.preferences)

# @app.route('/feedback', methods=['POST'])
# def feedback():
#     """Submit feedback for email classification"""
#     data = request.json
#     message_id = data.get('message_id')
#     correct_priority = data.get('priority')
    
#     if not message_id or not correct_priority:
#         return jsonify({"success": False, "error": "Missing parameters"})
    
#     success = email_agent.provide_feedback(message_id, correct_priority)
#     return jsonify({"success": success})

# @app.route('/test-connection', methods=['POST'])
# def test_connection():
#     """Test email connection with provided credentials"""
#     data = request.json
#     email_address = data.get('email')
#     password = data.get('password')
#     imap_server = data.get('server')
    
#     # Create temporary connector to test
#     connector = EmailConnector(email_address, password, imap_server)
#     success = connector.connect()
#     connector.disconnect()
    
#     return jsonify({"success": success})

# @app.route('/reset-summary', methods=['POST'])
# def reset_summary():
#     """Reset the daily summary"""
#     email_agent.reset_daily_summary()
#     return jsonify({"success": True})

# @app.route('/add-vip', methods=['POST'])
# def add_vip():
#     """Add a VIP sender"""
#     data = request.json
#     email = data.get('email')
    
#     if not email:
#         return jsonify({"success": False, "error": "Email address required"})
    
#     success = email_agent.add_vip_sender(email)
#     return jsonify({"success": success})

# @app.route('/remove-vip', methods=['POST'])
# def remove_vip():
#     """Remove a VIP sender"""
#     data = request.json
#     email = data.get('email')
    
#     if not email:
#         return jsonify({"success": False, "error": "Email address required"})
    
#     success = email_agent.remove_vip_sender(email)
#     return jsonify({"success": success})