const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Email server connection error:', error.message);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

// Send email function
const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const mailOptions = {
      from: `"Govt College Larkana" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      text,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
};

// Email templates
const emailTemplates = {
  // Welcome email for new users
  welcome: (name, email, password) => ({
    subject: 'Welcome to Government College Larkana',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a5f7a;">Welcome to Government College Larkana!</h2>
        <p>Dear ${name},</p>
        <p>Your account has been created successfully.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Temporary Password:</strong> ${password}</p>
        </div>
        <p>Please login and change your password immediately.</p>
        <p>Best regards,<br>Government College Larkana</p>
      </div>
    `
  }),

  // Password reset email
  resetPassword: (name, resetLink) => ({
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a5f7a;">Password Reset Request</h2>
        <p>Dear ${name},</p>
        <p>We received a request to reset your password.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${resetLink}" style="display: inline-block; background-color: #1a5f7a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>Government College Larkana</p>
      </div>
    `
  }),

  // Fee reminder email
  feeReminder: (name, amount, dueDate) => ({
    subject: 'Fee Payment Reminder',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a5f7a;">Fee Payment Reminder</h2>
        <p>Dear ${name},</p>
        <p>This is a reminder that your fee payment is due.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Amount Due:</strong> Rs. ${amount}</p>
          <p><strong>Due Date:</strong> ${dueDate}</p>
        </div>
        <p>Please make the payment at the earliest.</p>
        <p>Best regards,<br>Government College Larkana</p>
      </div>
    `
  }),

  // Notice notification
  noticeNotification: (name, noticeTitle, noticeContent) => ({
    subject: `Notice: ${noticeTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a5f7a;">${noticeTitle}</h2>
        <p>Dear ${name},</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          ${noticeContent}
        </div>
        <p>Best regards,<br>Government College Larkana</p>
      </div>
    `
  })
};

module.exports = {
  sendEmail,
  emailTemplates
};
