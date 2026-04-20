const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialize();
  }

  initialize() {
    // Expecting these in .env
    const config = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };

    if (config.auth.user && config.auth.pass) {
      this.transporter = nodemailer.createTransport(config);
      console.log('[EmailService] Transporter initialized');
    } else {
      console.warn('[EmailService] Missing SMTP credentials. Email functionality will be disabled.');
    }
  }

  async sendEmail(to, subject, html) {
    if (!this.transporter) {
      console.error('[EmailService] Transporter not initialized. Cannot send email.');
      return { success: false, error: 'Transporter not initialized' };
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"JARVIS AI" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });
      console.log(`[EmailService] Email sent to ${to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`[EmailService] Error sending to ${to}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async sendDailySummary(user, summaryData) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #333;">
        <h1 style="color: #6366f1;">📊 JARVIS Daily Summary</h1>
        <p>Hello ${user.name || user.username},</p>
        <p>Here is your overview for today, <b>${new Date().toLocaleDateString()}</b>:</p>
        
        <div style="background: #f3f4f6; padding: 15px; border-radius: 10px; margin: 20px 0;">
          <ul style="list-style: none; padding: 0;">
            <li style="margin-bottom: 10px;">✅ <b>Tasks Completed:</b> ${summaryData.tasksCompleted}</li>
            <li style="margin-bottom: 10px;">📝 <b>New Tasks:</b> ${summaryData.tasksCreated}</li>
            <li style="margin-bottom: 10px;">📅 <b>Calendar Events:</b> ${summaryData.eventsCount}</li>
            <li style="margin-bottom: 10px;">⚡ <b>Productivity Score:</b> ${summaryData.productivityScore}%</li>
          </ul>
        </div>
        
        <p style="color: #666; font-size: 0.9em;">Visit your JARVIS dashboard for more details.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 0.8em; color: #999;">This is an automated message from your JARVIS AI System.</p>
      </div>
    `;

    return await this.sendEmail(user.email, `Daily Summary - ${new Date().toLocaleDateString()}`, html);
  }
}

module.exports = new EmailService();
