const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const smtpPort = parseInt(process.env.SMTP_PORT) || 587;

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: smtpPort,
    secure: smtpPort === 465, // true for port 465 (SSL), false for 587 (STARTTLS)
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    connectionTimeout: 3000, // Fail fast (3 seconds) if Render blocks the SMTP ports
    greetingTimeout: 3000,
    socketTimeout: 5000
});

// Verify SMTP connection on startup so misconfiguration surfaces immediately
if (process.env.BYPASS_EMAIL_VERIFICATION !== 'true') {
    transporter.verify((error) => {
        if (error) {
            console.error('[MAILER] SMTP connection failed:', error.message);
        } else {
            console.log('[MAILER] SMTP connection established – ready to send emails');
        }
    });
} else {
    console.log('[MAILER] Email verification bypass is active. SMTP verify skipped.');
    
    // Override sendMail to bypass SMTP connection entirely and print to console logs
    transporter.sendMail = async (options) => {
        console.log(`[MAILER BYPASS] Successfully bypassed email to: ${options.to}`);
        console.log(`[MAILER BYPASS] Subject: ${options.subject}`);
        
        // Extract any links from the email HTML (like verification or password reset links)
        const linkMatch = options.html ? options.html.match(/href="([^"]+)"/) : null;
        if (linkMatch) {
            console.log(`[MAILER BYPASS] Action Link: ${linkMatch[1]}`);
        }
        
        return { messageId: 'bypass-id-' + Math.random().toString(36).substr(2, 9) };
    };
}

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

/**
 * Send a password reset link to the user
 * @param {string} toEmail - Recipient email address
 * @param {string} token - Password reset token
 */
async function sendPasswordResetEmail(toEmail, token) {
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const resetLink = `${baseUrl}/passwordReset?token=${token}`;

    const mailOptions = {
        from: process.env.SMTP_FROM || `"LifeLink" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: 'LifeLink – Reset Your Password',
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
                🔐 LifeLink
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
                Reset Your Password
              </h2>
              <p style="margin:0 0 28px;color:#6B7280;font-size:15px;line-height:1.6;">
                We received a request to reset your password. If you didn't make this request, you can ignore this email. Otherwise, click the button below to create a new password.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" 
                       style="display:inline-block;background:linear-gradient(135deg,#C82020,#991B1B);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 48px;border-radius:50px;box-shadow:0 4px 14px rgba(185,28,28,0.35);">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin:28px 0 0;color:#9CA3AF;font-size:13px;line-height:1.6;">
                This link will expire in <strong>1 hour</strong>. For security, we never send passwords via email.
              </p>
              
              <!-- Fallback link -->
              <div style="margin-top:24px;padding:16px;background:#f8f9fc;border-radius:8px;">
                <p style="margin:0 0 8px;color:#6B7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">
                  Or copy this link:
                </p>
                <p style="margin:0;color:#1d6a7a;font-size:13px;word-break:break-all;">
                  ${resetLink}
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
        console.log(`[MAILER] Password reset email sent to ${toEmail} (messageId: ${info.messageId})`);
        return true;
    } catch (error) {
        console.error(`[MAILER] Failed to send password reset email to ${toEmail}:`, error.message);
        // In dev mode, log the link so you can still test
        console.log(`[DEV FALLBACK] Password reset link for ${toEmail}: ${resetLink}`);
        return false;
    }
}

/**
 * Send an urgent/matched blood request email to a matched donor.
 * Called after admin approval when urgency_level === 'urgent'.
 * @param {object} user    - matched donor { email, fullname, blood_type, city }
 * @param {object} request - blood request row from DB (includes urgency_level)
 */
async function sendCriticalBloodRequestEmail(user, request) {
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

    // Build urgency label and color dynamically from the actual request level
    const urgencyRaw   = (request.urgency_level || 'urgent').toLowerCase();
    const urgencyLabel = urgencyRaw === 'urgent' ? 'URGENT' : urgencyRaw.toUpperCase();
    const urgencyColor = urgencyRaw === 'urgent' ? '#D97706' : '#C82020';  // amber for urgent, red for critical
    const headerTitle  = urgencyRaw === 'urgent' ? '🔶 URGENT BLOOD REQUEST' : '🚨 BLOOD REQUEST ALERT';
    const subjectEmoji = urgencyRaw === 'urgent' ? '🔶' : '🚨';

    const mailOptions = {
        from: process.env.SMTP_FROM || `"LifeLink" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: `${subjectEmoji} ${urgencyLabel} Blood Request – ${request.blood_type} Needed at ${request.hospital_name}`,
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
            <td style="background:linear-gradient(135deg,${urgencyColor},#991B1B);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                ${headerTitle}
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                LifeLink Blood Donation Management System
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 12px;color:#111827;font-size:20px;font-weight:700;">
                Dear ${user.fullname},
              </h2>
              <p style="margin:0 0 24px;color:#6B7280;font-size:15px;line-height:1.6;">
                An <strong style="color:${urgencyColor};">${urgencyLabel}</strong> blood request matching your blood group
                has been approved and posted in your city. Please help if you are available.
              </p>

              <!-- Request Details Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 28px;font-size:14px;">
                <tr style="background:#fef2f2;">
                  <td style="padding:12px 16px;border:1px solid #fecaca;font-weight:600;width:45%;color:#374151;">Blood Group Required</td>
                  <td style="padding:12px 16px;border:1px solid #fecaca;color:#C82020;font-weight:700;font-size:16px;">${request.blood_type}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border:1px solid #e5e7eb;font-weight:600;color:#374151;">Patient Name</td>
                  <td style="padding:12px 16px;border:1px solid #e5e7eb;color:#374151;">${request.patient_name || 'Not specified'}</td>
                </tr>
                <tr style="background:#f9fafb;">
                  <td style="padding:12px 16px;border:1px solid #e5e7eb;font-weight:600;color:#374151;">Hospital</td>
                  <td style="padding:12px 16px;border:1px solid #e5e7eb;color:#374151;">${request.hospital_name}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border:1px solid #e5e7eb;font-weight:600;color:#374151;">City</td>
                  <td style="padding:12px 16px;border:1px solid #e5e7eb;color:#374151;">${request.city}</td>
                </tr>
                <tr style="background:#f9fafb;">
                  <td style="padding:12px 16px;border:1px solid #e5e7eb;font-weight:600;color:#374151;">Units Required</td>
                  <td style="padding:12px 16px;border:1px solid #e5e7eb;color:#374151;">${request.units_required}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border:1px solid #fecaca;font-weight:600;color:#374151;">Urgency Level</td>
                  <td style="padding:12px 16px;border:1px solid #fecaca;color:${urgencyColor};font-weight:700;">${urgencyLabel}</td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${baseUrl}/activeRequests"
                       style="display:inline-block;background:linear-gradient(135deg,${urgencyColor},#991B1B);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 48px;border-radius:50px;box-shadow:0 4px 14px rgba(185,28,28,0.35);">
                      View Blood Request
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:28px 0 0;color:#9CA3AF;font-size:13px;line-height:1.6;text-align:center;">
                You are receiving this email because your blood group (${user.blood_type}) matches
                this request in ${request.city}.<br/>
                If you have already helped or are unavailable, please ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;background:#f8f9fc;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;color:#9CA3AF;font-size:12px;">
                &copy; 2026 LifeLink Blood Donation Platform &middot; ${request.city}
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
        console.log(`[MAILER] ${urgencyLabel} blood request email sent to ${user.email} (messageId: ${info.messageId})`);
        return true;
    } catch (error) {
        console.error(`[MAILER] Failed to send ${urgencyLabel} email to ${user.email}:`, error.message);
        return false;
    }
}

/**
 * Send an urgent blood request alert email TO ADMINS
 * Called when a user submits an urgent urgency blood request (needs admin approval)
 * @param {object} admin     - admin user { email, fullname }
 * @param {object} request   - { blood_type, hospital_name, city, units_required, urgency_level, id }
 * @param {object} requester - { fullname } user who submitted
 */
async function sendUrgentRequestToAdminsEmail(admin, request, requester) {
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

    const mailOptions = {
        from: process.env.SMTP_FROM || `"LifeLink" <${process.env.SMTP_USER}>`,
        to: admin.email,
        subject: `🔶 [Action Required] Urgent Blood Request #${request.id} — ${request.blood_type} at ${request.hospital_name}`,
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
            <td style="background:linear-gradient(135deg,#D97706,#92400E);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                🔶 URGENT REQUEST — ADMIN APPROVAL NEEDED
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">
                LifeLink Blood Donation Management System
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="margin:0 0 8px;color:#111827;font-size:18px;font-weight:700;">
                Dear ${admin.fullname},
              </h2>
              <p style="margin:0 0 24px;color:#6B7280;font-size:15px;line-height:1.6;">
                An <strong style="color:#D97706;">URGENT</strong> blood request has been submitted by
                <strong>${requester.fullname}</strong> and requires your review and approval.
                Once approved, matched donors in the area will be notified by email.
              </p>

              <!-- Request Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 28px;font-size:14px;">
                <tr style="background:#fffbeb;">
                  <td style="padding:12px 16px;border:1px solid #fde68a;font-weight:600;width:45%;color:#374151;">Blood Group</td>
                  <td style="padding:12px 16px;border:1px solid #fde68a;color:#C82020;font-weight:700;font-size:16px;">${request.blood_type}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border:1px solid #e5e7eb;font-weight:600;color:#374151;">Hospital</td>
                  <td style="padding:12px 16px;border:1px solid #e5e7eb;color:#374151;">${request.hospital_name}</td>
                </tr>
                <tr style="background:#f9fafb;">
                  <td style="padding:12px 16px;border:1px solid #e5e7eb;font-weight:600;color:#374151;">City</td>
                  <td style="padding:12px 16px;border:1px solid #e5e7eb;color:#374151;">${request.city || '—'}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border:1px solid #e5e7eb;font-weight:600;color:#374151;">Units Required</td>
                  <td style="padding:12px 16px;border:1px solid #e5e7eb;color:#374151;">${request.units_required}</td>
                </tr>
                <tr style="background:#fffbeb;">
                  <td style="padding:12px 16px;border:1px solid #fde68a;font-weight:600;color:#374151;">Urgency</td>
                  <td style="padding:12px 16px;border:1px solid #fde68a;color:#D97706;font-weight:700;">🔶 URGENT</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border:1px solid #e5e7eb;font-weight:600;color:#374151;">Submitted By</td>
                  <td style="padding:12px 16px;border:1px solid #e5e7eb;color:#374151;">${requester.fullname}</td>
                </tr>
              </table>

              <!-- CTA Button -->
              <div style="text-align:center;margin:0 0 24px;">
                <a href="${baseUrl}/pendingRequests"
                   style="display:inline-block;background:linear-gradient(135deg,#D97706,#92400E);color:#ffffff;
                          text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;">
                  Review &amp; Approve Request
                </a>
              </div>

              <p style="margin:0;color:#9CA3AF;font-size:13px;text-align:center;line-height:1.5;">
                Please log in to the LifeLink Admin Panel to take action.<br/>
                Approving this request will automatically notify matched donors by email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;color:#9CA3AF;font-size:12px;">
                LifeLink Blood Donation Management System &bull; This is an automated alert.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[MAILER] Urgent admin alert sent to ${admin.email} (messageId: ${info.messageId})`);
        return true;
    } catch (error) {
        console.error(`[MAILER] Failed to send urgent admin alert to ${admin.email}:`, error.message);
        return false;
    }
}

/**
 * Send a critical blood request alert email TO ADMINS
 * Called when a user submits a critical urgency blood request
 * @param {object} admin   - admin user { email, fullname }
 * @param {object} request - { blood_type, hospital_name, city, units_required, urgency_level, id }
 * @param {object} requester - { fullname } user who submitted
 */
async function sendCriticalRequestToAdminsEmail(admin, request, requester) {
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

    const mailOptions = {
        from: process.env.SMTP_FROM || `"LifeLink" <${process.env.SMTP_USER}>`,
        to: admin.email,
        subject: `🚨 [Action Required] Critical Blood Request #${request.id} — ${request.blood_type} at ${request.hospital_name}`,
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
            <td style="background:linear-gradient(135deg,#C82020,#7f1d1d);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                🚨 CRITICAL REQUEST — ADMIN ACTION REQUIRED
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">
                LifeLink Blood Donation Management System
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="margin:0 0 8px;color:#111827;font-size:18px;font-weight:700;">
                Dear ${admin.fullname},
              </h2>
              <p style="margin:0 0 24px;color:#6B7280;font-size:15px;line-height:1.6;">
                A <strong style="color:#C82020;">CRITICAL</strong> blood request has been submitted by
                <strong>${requester.fullname}</strong> and requires your immediate review.
                This request will appear in the <strong>Receiver Requests</strong> section of Inventory Management.
              </p>

              <!-- Request Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 28px;font-size:14px;">
                <tr style="background:#fef2f2;">
                  <td style="padding:12px 16px;border:1px solid #fecaca;font-weight:600;width:45%;color:#374151;">Blood Group</td>
                  <td style="padding:12px 16px;border:1px solid #fecaca;color:#C82020;font-weight:700;font-size:16px;">${request.blood_type}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border:1px solid #e5e7eb;font-weight:600;color:#374151;">Hospital</td>
                  <td style="padding:12px 16px;border:1px solid #e5e7eb;color:#374151;">${request.hospital_name}</td>
                </tr>
                <tr style="background:#f9fafb;">
                  <td style="padding:12px 16px;border:1px solid #e5e7eb;font-weight:600;color:#374151;">City</td>
                  <td style="padding:12px 16px;border:1px solid #e5e7eb;color:#374151;">${request.city || '—'}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border:1px solid #e5e7eb;font-weight:600;color:#374151;">Units Required</td>
                  <td style="padding:12px 16px;border:1px solid #e5e7eb;color:#374151;">${request.units_required}</td>
                </tr>
                <tr style="background:#f9fafb;">
                  <td style="padding:12px 16px;border:1px solid #e5e7eb;font-weight:600;color:#374151;">Urgency</td>
                  <td style="padding:12px 16px;border:1px solid #e5e7eb;color:#C82020;font-weight:700;">🚨 CRITICAL</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border:1px solid #e5e7eb;font-weight:600;color:#374151;">Submitted By</td>
                  <td style="padding:12px 16px;border:1px solid #e5e7eb;color:#374151;">${requester.fullname}</td>
                </tr>
              </table>

              <!-- CTA Button -->
              <div style="text-align:center;margin:0 0 24px;">
                <a href="${baseUrl}/adminInventory"
                   style="display:inline-block;background:linear-gradient(135deg,#C82020,#991B1B);color:#ffffff;
                          text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;">
                  Go to Receiver Requests
                </a>
              </div>

              <p style="margin:0;color:#9CA3AF;font-size:13px;text-align:center;line-height:1.5;">
                Please log in to the LifeLink Admin Panel to take action.<br/>
                Contact the patient externally, then Approve or Decline from Inventory Management.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;color:#9CA3AF;font-size:12px;">
                LifeLink Blood Donation Management System &bull; This is an automated alert.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[MAILER] Critical admin alert sent to ${admin.email} (messageId: ${info.messageId})`);
        return true;
    } catch (error) {
        console.error(`[MAILER] Failed to send admin alert to ${admin.email}:`, error.message);
        return false;
    }
}

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendCriticalBloodRequestEmail,
    sendUrgentRequestToAdminsEmail,
    sendCriticalRequestToAdminsEmail
};

