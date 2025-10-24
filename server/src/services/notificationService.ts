import { logger } from '../utils/logger'

export interface EmailNotification {
  to: string
  subject: string
  body: string
  html?: string
}

export interface SMSNotification {
  to: string
  message: string
}

/**
 * Notification Service
 * Handles email and SMS notifications for the system
 */
export class NotificationService {
  /**
   * Send email notification
   */
  static async sendEmail(notification: EmailNotification): Promise<{ success: boolean; message: string }> {
    try {
      // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
      // For now, we'll log the email content
      
      logger.info('Email notification sent:', {
        to: notification.to,
        subject: notification.subject,
        timestamp: new Date().toISOString()
      })

      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 100))

      return {
        success: true,
        message: 'Email sent successfully'
      }
    } catch (error) {
      logger.error('Send email error:', error)
      return {
        success: false,
        message: 'Failed to send email'
      }
    }
  }

  /**
   * Send SMS notification
   */
  static async sendSMS(notification: SMSNotification): Promise<{ success: boolean; message: string }> {
    try {
      // TODO: Integrate with actual SMS service (Twilio, AWS SNS, etc.)
      // For now, we'll log the SMS content
      
      logger.info('SMS notification sent:', {
        to: notification.to,
        message: notification.message.substring(0, 50) + '...',
        timestamp: new Date().toISOString()
      })

      // Simulate SMS sending delay
      await new Promise(resolve => setTimeout(resolve, 100))

      return {
        success: true,
        message: 'SMS sent successfully'
      }
    } catch (error) {
      logger.error('Send SMS error:', error)
      return {
        success: false,
        message: 'Failed to send SMS'
      }
    }
  }

  /**
   * Send payment reminder email
   */
  static async sendPaymentReminderEmail(
    customerEmail: string,
    customerName: string,
    invoiceNumber: string,
    amount: number,
    dueDate: Date,
    daysOverdue: number,
    reminderCount: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const reminderType = reminderCount === 1 ? 'First' : 
                          reminderCount === 2 ? 'Second' : 'Final'
      
      const urgencyLevel = reminderCount >= 3 ? 'URGENT' : reminderCount === 2 ? 'Important' : ''
      const subject = `${urgencyLevel ? urgencyLevel + ' - ' : ''}${reminderType} Payment Reminder - Invoice ${invoiceNumber}`

      const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(amount)
      }

      const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }

      const body = `
Dear ${customerName},

This is a ${reminderType.toLowerCase()} reminder that your invoice ${invoiceNumber} is now ${daysOverdue} days overdue.

Invoice Details:
- Invoice Number: ${invoiceNumber}
- Amount Due: ${formatCurrency(amount)}
- Due Date: ${formatDate(dueDate)}
- Days Overdue: ${daysOverdue}

${reminderCount >= 3 ? 
  'URGENT: This is your final notice. Please remit payment immediately to avoid service interruption or collection action.' :
  'Please remit payment at your earliest convenience to avoid any service interruptions.'
}

If you have already sent payment, please disregard this notice.

Thank you for your business.

Best regards,
Mosaajii POS System
      `.trim()

      const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .invoice-details { background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .urgent { color: #dc3545; font-weight: bold; }
        .important { color: #fd7e14; font-weight: bold; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 0.9em; color: #6c757d; }
    </style>
</head>
<body>
    <div class="header">
        <h2 ${reminderCount >= 3 ? 'class="urgent"' : reminderCount === 2 ? 'class="important"' : ''}>
            ${urgencyLevel ? urgencyLevel + ' - ' : ''}${reminderType} Payment Reminder
        </h2>
    </div>
    
    <p>Dear ${customerName},</p>
    
    <p>This is a ${reminderType.toLowerCase()} reminder that your invoice <strong>${invoiceNumber}</strong> is now <strong>${daysOverdue} days overdue</strong>.</p>
    
    <div class="invoice-details">
        <h3>Invoice Details:</h3>
        <ul>
            <li><strong>Invoice Number:</strong> ${invoiceNumber}</li>
            <li><strong>Amount Due:</strong> ${formatCurrency(amount)}</li>
            <li><strong>Due Date:</strong> ${formatDate(dueDate)}</li>
            <li><strong>Days Overdue:</strong> ${daysOverdue}</li>
        </ul>
    </div>
    
    <p ${reminderCount >= 3 ? 'class="urgent"' : ''}>
        ${reminderCount >= 3 ? 
          '<strong>URGENT:</strong> This is your final notice. Please remit payment immediately to avoid service interruption or collection action.' :
          'Please remit payment at your earliest convenience to avoid any service interruptions.'
        }
    </p>
    
    <p>If you have already sent payment, please disregard this notice.</p>
    
    <p>Thank you for your business.</p>
    
    <div class="footer">
        <p>Best regards,<br>
        Mosaajii POS System</p>
    </div>
</body>
</html>
      `.trim()

      return await this.sendEmail({
        to: customerEmail,
        subject,
        body,
        html
      })
    } catch (error) {
      logger.error('Send payment reminder email error:', error)
      return {
        success: false,
        message: 'Failed to send payment reminder email'
      }
    }
  }

  /**
   * Send invoice status notification
   */
  static async sendInvoiceStatusNotification(
    customerEmail: string,
    customerName: string,
    invoiceNumber: string,
    status: string,
    amount: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const statusMessages = {
        SENT: 'Your invoice has been sent and is ready for payment.',
        VIEWED: 'Your invoice has been viewed.',
        PAID: 'Thank you! Your payment has been received and processed.',
        OVERDUE: 'Your invoice is now overdue. Please remit payment as soon as possible.'
      }

      const subject = `Invoice ${invoiceNumber} - Status Update: ${status}`
      const statusMessage = statusMessages[status as keyof typeof statusMessages] || `Invoice status updated to ${status}.`

      const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(amount)
      }

      const body = `
Dear ${customerName},

${statusMessage}

Invoice Details:
- Invoice Number: ${invoiceNumber}
- Amount: ${formatCurrency(amount)}
- Status: ${status}

${status === 'PAID' ? 
  'We appreciate your prompt payment!' :
  status === 'OVERDUE' ?
  'Please contact us if you have any questions about this invoice.' :
  'If you have any questions, please don\'t hesitate to contact us.'
}

Thank you for your business.

Best regards,
Mosaajii POS System
      `.trim()

      return await this.sendEmail({
        to: customerEmail,
        subject,
        body
      })
    } catch (error) {
      logger.error('Send invoice status notification error:', error)
      return {
        success: false,
        message: 'Failed to send invoice status notification'
      }
    }
  }
}