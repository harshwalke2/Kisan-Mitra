import { Request, Response } from 'express';
import { handleIncomingWhatsappMessage } from '../services/whatsappChatbotService';

const toTwiML = (message: string): string => {
  const safeMessage = String(message || '').replace(/]]>/g, ']]]]><![CDATA[>');
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message><![CDATA[${safeMessage}]]></Message></Response>`;
};

export const whatsappHealth = (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
    service: 'whatsapp-bot',
    timestamp: new Date().toISOString(),
  });
};

export const whatsappWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = String(req.body?.Body || '');
    const from = String(req.body?.From || 'unknown');
    const mediaUrl = String(req.body?.MediaUrl0 || '');
    const numMedia = Number(req.body?.NumMedia || 0);

    const reply = await handleIncomingWhatsappMessage({
      from,
      body,
      mediaUrl,
      numMedia: Number.isFinite(numMedia) ? numMedia : 0,
    });

    res.status(200).type('text/xml').send(toTwiML(reply));
  } catch (error) {
    const fallback = '⚠️ Something went wrong. Type menu to restart.';
    res.status(200).type('text/xml').send(toTwiML(fallback));
  }
};
