import nodemailer from 'nodemailer';
import { smtpConfig } from '../config/appConfig.js';
import { isClientAdminRole, isEmployeeRole } from '../controllers/invitationController.js';

export interface SendInvitationEmailParams {
  toEmail: string;
  recipientName: string;
  businessName: string;
  invitationUrl: string;
  expiresAt: Date;
  role?: string;
  invitedByName?: string;
}

export interface EmailSendResult {
  sent: boolean;
  requiresSetup: boolean;
  message: string;
  messageId?: string;
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    smtpConfig.host &&
    smtpConfig.user &&
    smtpConfig.pass
  );
}

function formatRoleTitle(role?: string): { title: string; subtitle: string; description: string } {
  const norm = (role || 'CUSTOMER_ADMIN').toUpperCase();
  if (norm === 'MANAGER') {
    return {
      title: 'Mandi Manager',
      subtitle: 'Auction Lots, Pricing & Staff Management',
      description: 'You have been appointed to supervise lots, produce pricing, and counter operations on the Vegetable POS portal.',
    };
  }
  if (norm === 'CASHIER') {
    return {
      title: 'POS Cashier',
      subtitle: 'Boli Billing, Daily Cash Entry & Invoices',
      description: 'You have been granted billing desk access to issue sales slips, record daily boli bids, and manage drawer collections.',
    };
  }
  if (norm === 'ACCOUNTANT') {
    return {
      title: 'Mandi Accountant',
      subtitle: 'Ledgers, Roznamcha & Reconciliation',
      description: 'You have been granted finance access to manage grower khatas, buyer ledgers, and daily roznamcha balance sheets.',
    };
  }
  if (isClientAdminRole(role)) {
    return {
      title: 'Customer Admin',
      subtitle: 'Primary Mandi Business Owner',
      description: 'You have been registered as the primary administrator for your wholesale Mandi business on the Vegetable POS Admin Portal.',
    };
  }
  return {
    title: 'POS Employee',
    subtitle: 'Mandi Counter Operations',
    description: 'You have been invited as an employee to access terminal operations on the Vegetable POS software.',
  };
}

export async function sendInvitationEmail(params: SendInvitationEmailParams): Promise<EmailSendResult> {
  const { toEmail, recipientName, businessName, invitationUrl, expiresAt, role = 'CUSTOMER_ADMIN', invitedByName } = params;

  // If SMTP is not configured, explicitly notify the caller without pretending
  if (!isSmtpConfigured()) {
    console.warn(
      `[Email Service Warning]: SMTP is not configured. Invitation email to "${toEmail}" could not be sent. Manual setup required in server/.env.`
    );
    return {
      sent: false,
      requiresSetup: true,
      message: 'Email service is not configured. Please configure SMTP_HOST, SMTP_USER, and SMTP_PASS in server/.env. You can share the invitation link manually.',
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      },
    });

    const fromAddress = smtpConfig.from || 'Vegetable POS <noreply@sudoleads.com>';
    const expiryFormatted = expiresAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const roleInfo = formatRoleTitle(role);
    const inviterText = invitedByName || 'Mandi Business Management';
    const isEmployee = isEmployeeRole(role);

    const subject = isEmployee
      ? `Action Required: Accept your ${roleInfo.title} invitation for ${businessName}`
      : `Action Required: Set up your ${roleInfo.title} account for ${businessName}`;

    const textContent = isEmployee
      ? `Hello ${recipientName},\n\nYou have been invited by ${inviterText} to join ${businessName} as a ${roleInfo.title}.\n\n${roleInfo.description}\n\nHOW TO ACTIVATE YOUR POS ACCOUNT:\n1. Click this link to accept your invitation:\n${invitationUrl}\n2. Open the installed Vegetable POS application on your Windows computer.\n3. Enter your email (${toEmail}) and create your password inside the POS application to activate your account.\n\nNote: You do not need to log into the web dashboard. Your account is accessed exclusively through the installed Vegetable POS software.\n\nThis invitation expires on ${expiryFormatted}.\n\nRegards,\nVegetable POS Team`
      : `Hello ${recipientName},\n\nYou have been invited by ${inviterText} to join ${businessName} as a ${roleInfo.title} on the Vegetable POS Admin Portal.\n\n${roleInfo.description}\n\nPlease open this link to set your password and activate your account:\n${invitationUrl}\n\nThis invitation link expires on ${expiryFormatted}.\n\nRegards,\nVegetable POS Team`;

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
            .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .header { background: #064e3b; padding: 28px 32px; text-align: left; }
            .brand { color: #ffffff; font-size: 20px; font-weight: 700; }
            .badge { display: inline-block; background: #047857; color: #d1fae5; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 6px; margin-left: 8px; vertical-align: middle; }
            .content { padding: 32px; }
            h2 { color: #0f172a; margin-top: 0; font-size: 20px; font-weight: 700; }
            p { font-size: 14px; line-height: 1.6; color: #475569; }
            .biz-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px 20px; margin: 20px 0; }
            .biz-title { font-size: 16px; font-weight: 700; color: #065f46; margin-bottom: 4px; }
            .biz-sub { font-size: 13px; font-weight: 600; color: #047857; margin-bottom: 2px; }
            .biz-inviter { font-size: 12px; color: #64748b; }
            .steps-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 18px 20px; margin: 20px 0; }
            .steps-title { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
            .step-item { font-size: 13px; color: #334155; margin-bottom: 6px; line-height: 1.5; }
            .cta-btn { display: inline-block; background-color: #047857; color: #ffffff !important; font-weight: 600; font-size: 14px; text-decoration: none; padding: 14px 28px; border-radius: 10px; margin: 12px 0 20px; }
            .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; font-size: 12px; color: #94a3b8; }
            .link-text { word-break: break-all; color: #047857; font-size: 12px; }
            .notice-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px; margin: 16px 0; font-size: 12px; color: #1e40af; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <span class="brand">Vegetable POS</span>
              <span class="badge">${isEmployee ? 'POS Employee Invitation' : 'Customer Admin Invitation'}</span>
            </div>
            <div class="content">
              <h2>${isEmployee ? 'You have been invited to join Vegetable POS' : 'Join Your Mandi Team'}</h2>
              <p>Hello <strong>${recipientName}</strong>,</p>
              <p>You have been invited by <strong>${inviterText}</strong> to join <strong>${businessName}</strong> as a <strong>${roleInfo.title}</strong>.</p>
              
              <div class="biz-card">
                <div class="biz-title">${businessName}</div>
                <div class="biz-sub">Role: ${roleInfo.title} (${roleInfo.subtitle})</div>
                <div class="biz-inviter">Authorized by: ${inviterText}</div>
              </div>

              <p>${roleInfo.description}</p>

              ${isEmployee ? `
                <div class="steps-box">
                  <div class="steps-title">📋 Easy 2-Step Activation:</div>
                  <div class="step-item"><strong>Step 1:</strong> Click the <strong>Accept Invitation</strong> button below to confirm your invitation.</div>
                  <div class="step-item"><strong>Step 2:</strong> Open the installed <strong>Vegetable POS application</strong> on your computer, enter your email (<code>${toEmail}</code>), and create your secure password to activate your account.</div>
                </div>

                <div class="notice-box">
                  ℹ️ <strong>Note:</strong> You do not need to log into the web dashboard. Your account is accessed and used directly through the installed Vegetable POS desktop software.
                </div>
              ` : `
                <p>Please click the button below to accept the invitation and choose your secure password:</p>
              `}

              <div style="text-align: center;">
                <a href="${invitationUrl}" class="cta-btn" target="_blank">${isEmployee ? 'Accept Invitation' : 'Accept Invitation & Set Password'}</a>
              </div>

              <p style="font-size: 12px; color: #64748b;">
                <strong>Note:</strong> This link is unique and will expire on <strong>${expiryFormatted}</strong>.
              </p>
              <p style="font-size: 12px; color: #64748b;">
                If the button above does not work, copy and paste this URL into your browser:<br>
                <a href="${invitationUrl}" class="link-text">${invitationUrl}</a>
              </p>
            </div>
            <div class="footer">
              Vegetable POS Cloud Sync Architecture • Designed & Maintained by SudoLeads Pakistan
            </div>
          </div>
        </body>
        </html>
      `;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });

    console.log(`[Email Service]: Invitation email for role "${roleInfo.title}" sent to ${toEmail} (Message ID: ${info.messageId})`);
    return {
      sent: true,
      requiresSetup: false,
      message: `Invitation successfully sent to ${toEmail}.`,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error(`[Email Service Error]: Failed to send email to ${toEmail}:`, error);
    return {
      sent: false,
      requiresSetup: false,
      message: `Email delivery failed: ${error.message || 'Unknown SMTP error'}`,
    };
  }
}
