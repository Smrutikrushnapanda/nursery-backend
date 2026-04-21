import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface VerificationEmailData {
  to: string;
  name: string;
  verificationToken: string;
  appUrl: string;
}

export interface PasswordResetEmailData {
  to: string;
  name: string;
  resetToken: string;
  appUrl: string;
}

export interface InvoiceEmailData {
  to: string;
  name: string;
  invoiceNumber: string;
  invoiceUrl: string;
  amount: string;
  dueDate: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private readonly fromAddress: string;
  private readonly appUrl: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT') || 587;
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    this.fromAddress = this.configService.get<string>('SMTP_USER') || 'noreply@nursery.com';
    this.appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    this.logger.log(`Email service initialized with SMTP host: ${host}`);
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: `"Nursery App" <${this.fromAddress}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      this.logger.log(`Email sent successfully to: ${options.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  async sendVerificationEmail(data: VerificationEmailData): Promise<boolean> {
    const verificationUrl = `${data.appUrl}/verify-email?token=${data.verificationToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .container { background: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #2e7d32; }
          .button { display: inline-block; background: #2e7d32; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🌱 Nursery App</div>
          </div>
          <h2>Verify Your Email Address</h2>
          <p>Hi ${data.name},</p>
          <p>Thank you for registering with Nursery App. Please verify your email address to get started.</p>
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email</a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <div class="footer">
            <p>If you didn't create an account, please ignore this email.</p>
            <p>© ${new Date().getFullYear()} Nursery App. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: data.to,
      subject: 'Verify Your Email - Nursery App',
      html,
      text: `Verify your email: ${verificationUrl}`,
    });
  }

  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
    const resetUrl = `${data.appUrl}/reset-password?token=${data.resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .container { background: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #2e7d32; }
          .button { display: inline-block; background: #d32f2f; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3e0; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🌱 Nursery App</div>
          </div>
          <h2>Reset Your Password</h2>
          <p>Hi ${data.name},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <div class="warning">
            <strong>⚠️ Important:</strong>
            <ul>
              <li>This link will expire in 1 hour.</li>
              <li>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</li>
            </ul>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Nursery App. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: data.to,
      subject: 'Reset Your Password - Nursery App',
      html,
      text: `Reset your password: ${resetUrl}`,
    });
  }

  async sendInvoiceEmail(data: InvoiceEmailData): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice #${data.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .container { background: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #2e7d32; }
          .invoice-box { border: 1px solid #e0e0e0; border-radius: 5px; padding: 20px; margin: 20px 0; }
          .invoice-header { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .invoice-title { font-size: 20px; font-weight: bold; color: #2e7d32; }
          .invoice-details { margin: 20px 0; }
          .invoice-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
          .total-row { font-size: 18px; font-weight: bold; color: #2e7d32; }
          .button { display: inline-block; background: #2e7d32; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🌱 Nursery App</div>
          </div>
          <h2>Invoice #${data.invoiceNumber}</h2>
          <p>Hi ${data.name},</p>
          <p>Thank you for your business. Please find your invoice details below:</p>
          <div class="invoice-box">
            <div class="invoice-header">
              <div>
                <strong>Invoice Number:</strong> ${data.invoiceNumber}<br>
                <strong>Date:</strong> ${new Date().toLocaleDateString()}
              </div>
            </div>
            <div class="invoice-details">
              <div class="invoice-row total-row">
                <span>Total Amount:</span>
                <span>${data.amount}</span>
              </div>
              <div class="invoice-row">
                <span>Due Date:</span>
                <span>${data.dueDate}</span>
              </div>
            </div>
          </div>
          <div style="text-align: center;">
            <a href="${data.invoiceUrl}" class="button">View Invoice</a>
          </div>
          <div class="footer">
            <p>If you have any questions, please contact us.</p>
            <p>© ${new Date().getFullYear()} Nursery App. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: data.to,
      subject: `Invoice #${data.invoiceNumber} - Nursery App`,
      html,
      text: `Your invoice ${data.invoiceNumber} is ready. Total: ${data.amount}`,
    });
  }

  async sendWelcomeEmail(to: string, name: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .container { background: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #2e7d32; }
          .features { list-style: none; padding: 0; }
          .features li { padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🌱 Nursery App</div>
          </div>
          <h2>Welcome to Nursery App, ${name}! 🎉</h2>
          <p>Thank you for joining us. We're excited to have you on board!</p>
          <p>With Nursery App, you can:</p>
          <ul class="features">
            <li>🌿 Manage your plant inventory with ease</li>
            <li>📱 Generate QR codes for your plants</li>
            <li>📊 Track customer scans and engagement</li>
            <li>🛒 Process orders and payments</li>
            <li>📄 Generate invoices and reports</li>
          </ul>
          <p>Need help? We're here to support you. Just reply to this email.</p>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Nursery App. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Welcome to Nursery App! 🎉',
      html,
    });
  }
}