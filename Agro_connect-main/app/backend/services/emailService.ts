import nodemailer from 'nodemailer';

type SendResetMailParams = {
  toEmail: string;
  username: string;
  resetLink: string;
};

type SendResetMailResult = {
  delivered: boolean;
  previewUrl?: string;
};

const getNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const createSmtpTransport = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: getNumber(process.env.SMTP_PORT, 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });
};

export const sendPasswordResetEmail = async (
  params: SendResetMailParams
): Promise<SendResetMailResult> => {
  const transport = createSmtpTransport();

  if (transport) {
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: params.toEmail,
      subject: 'AgroConnect Password Reset',
      text: `Hello ${params.username},\n\nReset your password using this link:\n${params.resetLink}\n\nThis link expires in 30 minutes.\nIf you did not request this, ignore this email.`,
      html: `<p>Hello ${params.username},</p><p>Reset your password using this link:</p><p><a href="${params.resetLink}">${params.resetLink}</a></p><p>This link expires in 30 minutes.</p><p>If you did not request this, ignore this email.</p>`,
    });

    return { delivered: true };
  }

  if (process.env.NODE_ENV === 'development') {
    const testAccount = await nodemailer.createTestAccount();
    const devTransport = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const info = await devTransport.sendMail({
      from: 'AgroConnect Dev <no-reply@agroconnect.local>',
      to: params.toEmail,
      subject: 'AgroConnect Password Reset (Dev)',
      text: `Hello ${params.username},\n\nReset your password using this link:\n${params.resetLink}`,
      html: `<p>Hello ${params.username},</p><p>Reset your password using this link:</p><p><a href="${params.resetLink}">${params.resetLink}</a></p>`,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    return { delivered: false, previewUrl };
  }

  return { delivered: false };
};
