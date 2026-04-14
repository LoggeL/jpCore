import { Resend } from 'resend';
import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../../config.js';
import { logger } from '../logger.js';
import type { RenderedEmail } from './templates.js';

const resend = config.email.resendKey ? new Resend(config.email.resendKey) : null;

let smtpTransport: Transporter | null = null;
if (config.email.smtp) {
  smtpTransport = nodemailer.createTransport({
    host: config.email.smtp.host,
    port: config.email.smtp.port,
    auth: config.email.smtp.user
      ? { user: config.email.smtp.user, pass: config.email.smtp.pass }
      : undefined,
  });
}

if (!resend && !smtpTransport) {
  logger.warn('No email transport configured (RESEND_API_KEY and SMTP_* missing). Emails will be logged only.');
}

export async function sendMail(to: string, email: RenderedEmail): Promise<void> {
  const { subject, html, text } = email;
  const from = config.email.from;
  const replyTo = config.email.replyTo;

  if (!resend && !smtpTransport) {
    logger.info({ to, subject }, 'email not sent (no transport)');
    return;
  }

  try {
    if (resend) {
      const result = await resend.emails.send({
        from,
        replyTo,
        to,
        subject,
        html,
        text,
      });
      logger.info({ to, subject, id: (result as { data?: { id?: string } }).data?.id }, 'email sent via Resend');
      return;
    }

    if (smtpTransport) {
      const result = await smtpTransport.sendMail({
        from,
        replyTo,
        to,
        subject,
        html,
        text,
      });
      logger.info({ to, subject, id: result.messageId }, 'email sent via SMTP');
    }
  } catch (err) {
    logger.error({ err, to, subject }, 'email send failed');
  }
}
