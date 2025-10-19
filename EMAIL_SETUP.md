# Email Setup for Recipe Sharing

To enable email sharing functionality, you need to configure the following environment variables in your `.env.local` file:

## Required Environment Variables

```bash
# Email Configuration
EMAIL_FROM=noreply@passionworksstudio.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

## Setup Instructions

### Option 1: Gmail SMTP (Recommended)
1. Use Gmail as your SMTP provider
2. Enable 2-factor authentication on your Gmail account
3. Generate an "App Password" for this application
4. Use the app password as `SMTP_PASSWORD`

### Option 2: Custom SMTP Server
1. Configure your own SMTP server
2. Update the SMTP settings accordingly

### Option 3: Email Service Providers
You can also use services like:
- SendGrid
- Mailgun
- Amazon SES
- Resend

## How It Works

1. **User Experience**: Users can share recipes via email through the share modal
2. **Email Masking**: Emails are sent from `noreply@passionworksstudio.com` but appear to come from the user's account
3. **PDF Attachment**: The recipe is automatically generated as a PDF and attached to the email
4. **Personal Touch**: Users can add a personal message that gets included in the email

## Testing

Once configured, users can:
1. Go to any recipe page
2. Click the Share button
3. Select the "Email" tab
4. Enter recipient email addresses
5. Add a subject and optional message
6. Send the recipe as a PDF attachment

The email will be sent from Passionworksstudio.com with the user's name as the sender.
