const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

/**
 * Send an email verification link to the user
 * @param {string} toEmail - Recipient email address
 * @param {string} token - Verification token
 */
async function sendVerificationEmail(toEmail, token) {
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const verifyLink = `${baseUrl}/api/auth/verify-email?token=${token}`;

    const mailOptions = {
        from: process.env.SMTP_FROM || `"LifeLink" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: 'LifeLink – Verify Your Email Address',
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#C82020,#991B1B);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                🩸 LifeLink
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                Blood Donation Management System
              </p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 12px;color:#111827;font-size:20px;font-weight:700;">
                Verify Your Email
              </h2>
              <p style="margin:0 0 28px;color:#6B7280;font-size:15px;line-height:1.6;">
                Thank you for creating a LifeLink account! Please click the button below to confirm your email address and activate your account.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${verifyLink}" 
                       style="display:inline-block;background:linear-gradient(135deg,#C82020,#991B1B);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 48px;border-radius:50px;box-shadow:0 4px 14px rgba(185,28,28,0.35);">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin:28px 0 0;color:#9CA3AF;font-size:13px;line-height:1.6;">
                This link will expire in <strong>24 hours</strong>. If you didn't create a LifeLink account, you can safely ignore this email.
              </p>
              
              <!-- Fallback link -->
              <div style="margin-top:24px;padding:16px;background:#f8f9fc;border-radius:8px;">
                <p style="margin:0 0 8px;color:#6B7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">
                  Or copy this link:
                </p>
                <p style="margin:0;color:#1d6a7a;font-size:13px;word-break:break-all;">
                  ${verifyLink}
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;background:#f8f9fc;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;color:#9CA3AF;font-size:12px;">
                © 2026 LifeLink. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[MAILER] Verification email sent to ${toEmail} (messageId: ${info.messageId})`);
        return true;
    } catch (error) {
        console.error(`[MAILER] Failed to send verification email to ${toEmail}:`, error.message);
        // In dev mode, log the link so you can still test
        console.log(`[DEV FALLBACK] Verification link for ${toEmail}: ${verifyLink}`);
        return false;
    }
}

module.exports = { sendVerificationEmail };
