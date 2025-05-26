import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
import markdown2

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger('promptcron')

def convert_markdown_to_html(text: str) -> str:
    """Convert markdown text to HTML with extras enabled"""
    return markdown2.markdown(
        text,
        extras=[
            "fenced-code-blocks",
            "tables",
            "break-on-newline",
            "cuddled-lists",
            "target-blank-links"
        ]
    ) 

def send_email(to_emails, subject, body):
    """Send email using SMTP with HTML support"""
    smtp_server = "smtp.gmail.com"
    smtp_port = 465
    smtp_username = os.getenv('SMTP_USERNAME')
    smtp_password = os.getenv('SMTP_PASSWORD')

    msg = MIMEMultipart('alternative')
    msg['From'] = smtp_username
    msg['To'] = ', '.join(to_emails)
    msg['Subject'] = subject

    # Convert markdown to HTML and add styling
    html_content = f"""
    <html>
        <head>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .prompt {{
                    background-color: #f5f5f5;
                    padding: 15px;
                    border-radius: 5px;
                    margin-bottom: 20px;
                }}
                .response {{
                    margin-bottom: 20px;
                }}
                .sources {{
                    border-top: 1px solid #ddd;
                    padding-top: 15px;
                    margin-top: 20px;
                }}
                a {{
                    color: #0066cc;
                    text-decoration: none;
                }}
                a:hover {{
                    text-decoration: underline;
                }}
                code {{
                    background-color: #f8f8f8;
                    padding: 2px 4px;
                    border-radius: 3px;
                    font-family: monospace;
                }}
                pre {{
                    background-color: #f8f8f8;
                    padding: 15px;
                    border-radius: 5px;
                    overflow-x: auto;
                }}
            </style>
        </head>
        <body>
            {convert_markdown_to_html(body)}
        </body>
    </html>
    """

    # Attach both plain text and HTML versions
    msg.attach(MIMEText(body, 'plain'))
    msg.attach(MIMEText(html_content, 'html'))

    logger.info(f"Sending email to {to_emails}, subject: {subject}")
    with smtplib.SMTP_SSL(smtp_server, smtp_port) as server:
        server.login(smtp_username, smtp_password)
        server.send_message(msg) 
