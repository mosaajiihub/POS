import nodemailer from 'nodemailer'
import twilio from 'twilio'
import { logger } from '../utils/logger'

// Email configuration
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
}

// SMS configuration
const smsConfig = {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  phoneNumber: process.env.TWILIO_PHONE_NUMBER
}

// Create email transporter
let emailTransporter: nodemailer.Transporter | null = null
if (emailConfig.auth.user && emailConfig.auth.pass) {
  emailTransporter = nodemailer.createTransporter(emailConfig)
}

// Create SMS client
let smsClient: twilio.Twilio | null = null
if (smsConfig.accountSid && smsConfig.authToken) {
  smsClient = twilio(smsConfig.accountSid, smsConfig.authToken)
}

export interface EmailOptions {
  to: string
  subject: string
  text?: string
  html?: string
}

export interface SMSOptions {
  to: string
  message: string
}

export interface NotificationResult {
  success: boolean
  message: string
  messageId?: string
}

/**
 * Notification Service
 * Handles email and SMS delivery for OTP and other notifications
 */
export class NotificationService {
  /**
   * Send email notification
   */
  static async sendEmail(options: EmailOptions): Promise<NotificationResult> {
    try {
      if (!emailTransporter) {
        logger.error('Email transporter not configured')
        return {
          success: false,
          message: 'Email service not configured'
        }
      }

      const mailOptions = {
        from: `${process.env.FROM_NAME || 'Mosaajii POS'} <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      }

      const info = await emailTransporter.sendMail(mailOptions)
      
      logger.info(`Email sent successfully to ${options.to}, messageId: ${info.messageId}`)
      
      return {
        success: true,
        message: 'Email sent successfully',
        messageId: info.messageId
      }
    } catch (error) {
      logger.error('Email sending failed:', error)
      return {
        success: false,
        message: 'Failed to send email'
      }
    }
  }

  /**
   * Send SMS notification
   */
  static async sendSMS(options: SMSOptions): Promise<NotificationResult> {
    try {
      if (!smsClient || !smsConfig.phoneNumber) {
        logger.error('SMS client not configured')
        return {
          success: false,
          message: 'SMS service not configured'
        }
      }

      const message = await smsClient.messages.create({
        body: options.message,
        from: smsConfig.phoneNumber,
        to: options.to
      })

      logger.info(`SMS sent successfully to ${options.to}, messageId: ${message.sid}`)

      return {
        success: true,
        message: 'SMS sent successfully',
        messageId: message.sid
      }
    } catch (error) {
      logger.error('SMS sending failed:', error)
      return {
        success: false,
        message: 'Failed to send SMS'
      }
    }
  }

  /**
   * Send OTP via email
   */
  static async sendOTPEmail(email: string, otp: string, userName: string): Promise<NotificationResult> {
    const subject = 'Your Mosaajii POS Access Code'
    const text = `
Hello ${userName},

Your access code for Mosaajii POS is: ${otp}

This code will expire in 15 minutes. Please use it to activate your account.

If you didn't request this code, please contact your administrator immediately.

Best regards,
Mosaajii POS Team
    `.trim()

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Mosaajii POS Access Code</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563EB; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .otp-code { font-size: 32px; font-weight: bold; color: #2563EB; text-align: center; letter-spacing: 4px; margin: 20px 0; padding: 15px; background-color: white; border-radius: 8px; border: 2px dashed #2563EB; }
        .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Mosaajii POS</h1>
            <p>Your Access Code</p>
        </div>
        <div class="content">
            <p>Hello <strong>${userName}</strong>,</p>
            <p>Your access code for Mosaajii POS is:</p>
            <div class="otp-code">${otp}</div>
            <p>This code will expire in <strong>15 minutes</strong>. Please use it to activate your account.</p>
            <div class="warning">
                <strong>Security Notice:</strong> If you didn't request this code, please contact your administrator immediately.
            </div>
        </div>
        <div class="footer">
            <p>Best regards,<br>Mosaajii POS Team</p>
        </div>
    </div>
</body>
</html>
    `.trim()

    return await this.sendEmail({
      to: email,
      subject,
      text,
      html
    })
  }

  /**
   * Send OTP via SMS
   */
  static async sendOTPSMS(phoneNumber: string, otp: string, userName: string): Promise<NotificationResult> {
    const message = `Hello ${userName}, your Mosaajii POS access code is: ${otp}. This code expires in 15 minutes. If you didn't request this, contact your administrator.`

    return await this.sendSMS({
      to: phoneNumber,
      message
    })
  }

  /**
   * Send welcome email to new user
   */
  static async sendWelcomeEmail(email: string, userName: string, tempPassword?: string): Promise<NotificationResult> {
    const subject = 'Welcome to Mosaajii POS'
    const text = `
Hello ${userName},

Welcome to Mosaajii POS! Your account has been created successfully.

${tempPassword ? `Your temporary password is: ${tempPassword}` : 'Please contact your administrator for your login credentials.'}

Next steps:
1. Wait for payment verification from your administrator
2. You will receive an access code via email once payment is verified
3. Use the access code to activate your account
4. ${tempPassword ? 'Change your password after first login' : 'Log in with your credentials'}

If you have any questions, please contact your administrator.

Best regards,
Mosaajii POS Team
    `.trim()

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Mosaajii POS</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .steps { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .step { margin: 10px 0; padding: 10px; border-left: 4px solid #10B981; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to Mosaajii POS!</h1>
        </div>
        <div class="content">
            <p>Hello <strong>${userName}</strong>,</p>
            <p>Welcome to Mosaajii POS! Your account has been created successfully.</p>
            ${tempPassword ? `<p><strong>Your temporary password is:</strong> <code>${tempPassword}</code></p>` : '<p>Please contact your administrator for your login credentials.</p>'}
            <div class="steps">
                <h3>Next Steps:</h3>
                <div class="step">1. Wait for payment verification from your administrator</div>
                <div class="step">2. You will receive an access code via email once payment is verified</div>
                <div class="step">3. Use the access code to activate your account</div>
                <div class="step">4. ${tempPassword ? 'Change your password after first login' : 'Log in with your credentials'}</div>
            </div>
            <p>If you have any questions, please contact your administrator.</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>Mosaajii POS Team</p>
        </div>
    </div>
</body>
</html>
    `.trim()

    return await this.sendEmail({
      to: email,
      subject,
      text,
      html
    })
  }

  /**
   * Send account activation notification
   */
  static async sendActivationEmail(email: string, userName: string): Promise<NotificationResult> {
    const subject = 'Account Activated - Mosaajii POS'
    const text = `
Hello ${userName},

Great news! Your Mosaajii POS account has been successfully activated.

You can now log in to the system using your credentials and start using all the features.

If you need any assistance, please don't hesitate to contact your administrator.

Best regards,
Mosaajii POS Team
    `.trim()

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Activated</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .success { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 4px; margin: 20px 0; color: #155724; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Account Activated!</h1>
        </div>
        <div class="content">
            <p>Hello <strong>${userName}</strong>,</p>
            <div class="success">
                <strong>Great news!</strong> Your Mosaajii POS account has been successfully activated.
            </div>
            <p>You can now log in to the system using your credentials and start using all the features.</p>
            <p>If you need any assistance, please don't hesitate to contact your administrator.</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>Mosaajii POS Team</p>
        </div>
    </div>
</body>
</html>
    `.trim()

    return await this.sendEmail({
      to: email,
      subject,
      text,
      html
    })
  }

  /**
   * Test email configuration
   */
  static async testEmailConfig(): Promise<NotificationResult> {
    try {
      if (!emailTransporter) {
        return {
          success: false,
          message: 'Email transporter not configured'
        }
      }

      await emailTransporter.verify()
      
      return {
        success: true,
        message: 'Email configuration is valid'
      }
    } catch (error) {
      logger.error('Email configuration test failed:', error)
      return {
        success: false,
        message: 'Email configuration is invalid'
      }
    }
  }

  /**
   * Test SMS configuration
   */
  static async testSMSConfig(): Promise<NotificationResult> {
    try {
      if (!smsClient) {
        return {
          success: false,
          message: 'SMS client not configured'
        }
      }

      // Test by fetching account info
      await smsClient.api.accounts(smsConfig.accountSid!).fetch()
      
      return {
        success: true,
        message: 'SMS configuration is valid'
      }
    } catch (error) {
      logger.error('SMS configuration test failed:', error)
      return {
        success: false,
        message: 'SMS configuration is invalid'
      }
    }
  }
}