/**
 * E-mail versturen voor ouderlijke toestemming. Provider-onafhankelijk: nu Resend (HTTPS-API), later
 * eenvoudig uit te breiden. Zonder geconfigureerde provider wordt er NIETS verzonden (sent:false) en
 * activeert er ook niets automatisch — de aanroeper handelt dat veilig af. Geen tokens/geheimen in logs.
 */
import type { Env } from '../env.ts';

export interface SendResult { sent: boolean; provider: string; error?: string }

export async function sendEmail(env: Env, msg: { to: string; subject: string; html: string; text: string }): Promise<SendResult> {
  if (env.EMAIL_PROVIDER === 'resend' && env.RESEND_API_KEY && env.EMAIL_FROM) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: env.EMAIL_FROM, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
      });
      if (res.ok) return { sent: true, provider: 'resend' };
      return { sent: false, provider: 'resend', error: `resend_${res.status}` };
    } catch {
      return { sent: false, provider: 'resend', error: 'resend_netwerk' };
    }
  }
  return { sent: false, provider: 'none' };
}

const shell = (inner: string) => `<!doctype html><html lang="nl"><body style="margin:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#13223d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.08)">
<tr><td style="background:#0b1f4d;color:#fff;padding:18px 24px;font-weight:800;font-size:20px;letter-spacing:.04em">RANK11.</td></tr>
<tr><td style="padding:24px">${inner}</td></tr>
</table></td></tr></table></body></html>`;

const btn = (href: string, label: string, bg: string) =>
  `<a href="${href}" style="display:inline-block;background:${bg};color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:700">${label}</a>`;

/** Vriendelijke toestemmingsmail aan de ouder. Links wijzen naar de goedkeuringspagina (ouder klikt bewust). */
export function buildConsentEmail(username: string, pageUrl: string, privacyUrl: string): { subject: string; html: string; text: string } {
  const safe = username.replace(/[<>&]/g, '');
  const inner = `
<p style="font-size:16px;margin:0 0 10px">Hoi,</p>
<p style="margin:0 0 10px">Je kind (<b>${safe}</b>) wil graag RANK11 spelen.</p>
<p style="margin:0 0 10px">RANK11 is een voetbalspel waarin kinderen hun eigen schoolcijfers kunnen invoeren. Met die cijfers verdienen ze punten, spelerskaarten en beloningen. Ze kunnen ook tegen vrienden spelen.</p>
<p style="margin:0 0 16px">De cijfers worden niet officieel gecontroleerd en zijn niet zichtbaar voor andere spelers. Andere spelers zien alleen de spelgegevens en resultaten die nodig zijn voor de competitie.</p>
<p style="margin:0 0 8px"><b>Wil je toestemming geven?</b></p>
<p style="margin:0 0 16px">${btn(pageUrl, 'Bekijk en beslis', '#1f6bff')}</p>
<p style="margin:0 0 4px;font-size:13px;color:#56607a">Op die pagina kun je toestemming geven of weigeren.</p>
<p style="margin:0;font-size:13px;color:#56607a">Meer informatie: <a href="${privacyUrl}" style="color:#1f6bff">Privacyverklaring</a></p>
<p style="margin:16px 0 0">Groeten,<br>RANK11.</p>`;
  const text = `Hoi,

Je kind (${safe}) wil graag RANK11 spelen. RANK11 is een voetbalspel waarin kinderen hun eigen schoolcijfers invoeren om punten, spelerskaarten en beloningen te verdienen. Ze kunnen ook tegen vrienden spelen. De cijfers zijn niet officieel en niet zichtbaar voor andere spelers.

Bekijk en beslis (toestemming geven of weigeren): ${pageUrl}
Privacyverklaring: ${privacyUrl}

Groeten, RANK11.`;
  return { subject: 'Geef toestemming voor RANK11.', html: shell(inner), text };
}

/** E-mail met een beveiligde link om een eerder gegeven toestemming in te trekken. */
export function buildRevokeEmail(pageUrl: string): { subject: string; html: string; text: string } {
  const inner = `
<p style="font-size:16px;margin:0 0 10px">Hoi,</p>
<p style="margin:0 0 16px">Je vroeg om je toestemming voor RANK11 in te trekken. Klik hieronder om dit te bevestigen.</p>
<p style="margin:0 0 16px">${btn(pageUrl, 'Toestemming intrekken', '#b23b3b')}</p>
<p style="margin:0;font-size:13px;color:#56607a">Heb je dit niet aangevraagd? Dan hoef je niets te doen; er verandert niets.</p>
<p style="margin:16px 0 0">Groeten,<br>RANK11.</p>`;
  const text = `Hoi,\n\nJe vroeg om je toestemming voor RANK11 in te trekken. Bevestig via: ${pageUrl}\n\nHeb je dit niet aangevraagd? Dan hoef je niets te doen.\n\nGroeten, RANK11.`;
  return { subject: 'Toestemming voor RANK11 intrekken', html: shell(inner), text };
}
