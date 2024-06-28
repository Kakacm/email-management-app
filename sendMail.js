require('dotenv').config();
const nodemailer = require('nodemailer');
const path = require('path');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true, // 使用 SSL/TLS
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD
  }
});

async function sendEmail(to, subject, text, attachments) {
  const mailOptions = {
    from: process.env.EMAIL,
    to: to,
    subject: subject,
    text: text,
    attachments: attachments.map(file => ({
      filename: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      path: file.path,
      contentDisposition: 'attachment; filename="' + encodeURIComponent(file.originalname) + '"'
    }))
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
    return info.response;
  } catch (error) {
    console.error('Error sending email: ' + error);
    throw error;
  }
}

module.exports = sendEmail;
