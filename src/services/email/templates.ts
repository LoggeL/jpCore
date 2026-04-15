// Poolparty 2026 email templates — hand-drawn, playful vibe.
// Theme aligned with the jp-site 2026 pink design: accent #ff2d87, postit #ffe4f1.

const FOOTER = `
  <tr><td style="padding:32px 24px 24px;text-align:center;font-size:13px;color:#888;font-family:'Comic Neue','Segoe Print','Comic Sans MS',cursive,sans-serif;">
    🏊 Poolparty 2026 · Kolpingwiese Ramsen 🌊<br>
    <span style="font-size:11px;color:#bbb;">Diese E-Mail wurde automatisch versendet.</span>
  </td></tr>`;

const SVG_HEADER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 80" style="width:100%;height:auto;display:block;">
  <rect width="600" height="80" fill="#ff2d87" rx="0"/>
  <text x="300" y="32" text-anchor="middle" font-size="14" fill="#fff" font-family="'Comic Neue','Segoe Print',cursive,sans-serif" opacity="0.7">〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️</text>
  <text x="300" y="58" text-anchor="middle" font-size="28" font-weight="bold" fill="#fff" font-family="'Comic Neue','Segoe Print',cursive,sans-serif">🏊 Poolparty 2026 🎉</text>
  <text x="300" y="75" text-anchor="middle" font-size="12" fill="#fff" font-family="'Comic Neue','Segoe Print',cursive,sans-serif" opacity="0.6">〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️</text>
</svg>`;

function wrap(content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#e8e4df;font-family:'Comic Neue','Segoe Print','Comic Sans MS',cursive,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#e8e4df;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fdfbf7;border:3px solid #2d2d2d;border-radius:18px 4px 18px 4px;box-shadow:6px 6px 0px 0px #2d2d2d;overflow:hidden;">
  <tr><td style="padding:0;">${SVG_HEADER}</td></tr>
  ${content}
  ${FOOTER}
</table>
</td></tr></table></body></html>`;
}

function card(html: string): string {
  return `<div style="background:#fff;border:2px solid #2d2d2d;border-radius:12px 4px 12px 4px;box-shadow:4px 4px 0px 0px #2d2d2d;padding:16px;margin:8px 0;">${html}</div>`;
}

function postit(html: string): string {
  return `<div style="background:#ffe4f1;border:2px solid #2d2d2d;border-radius:4px 12px 4px 12px;box-shadow:4px 4px 0px 0px #2d2d2d;padding:16px;margin:8px 0;transform:rotate(-1deg);">${html}</div>`;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text?: string;
}

export const templates = {
  registrationSuccessful: (data: { name: string; itemName: string }): RenderedEmail => ({
    subject: 'Du bist dabei! 🎉 Poolparty Anmeldung bestätigt',
    html: wrap(`
      <tr><td style="padding:24px 32px;">
        <h1 style="color:#ff2d87;font-size:28px;margin:0 0 8px;">Du bist dabei! 🎉</h1>
        <p style="font-size:18px;color:#2d2d2d;margin:0 0 20px;">Hi <strong>${data.name}</strong>!</p>
        <p style="font-size:16px;color:#2d2d2d;">Deine Anmeldung zur Poolparty ist bestätigt! Wir freuen uns riesig auf dich! 🥳</p>
        ${card(`
          <p style="margin:0 0 8px;font-size:14px;color:#888;">📦 Du bringst mit:</p>
          <p style="margin:0;font-size:20px;color:#2d5da1;font-weight:bold;">${data.itemName}</p>
        `)}
        ${postit(`
          <p style="margin:0;font-size:15px;color:#2d2d2d;">📅 <strong>Wann:</strong> Samstag, 27. Juni 2026</p>
          <p style="margin:4px 0 0;font-size:15px;color:#2d2d2d;">📍 <strong>Wo:</strong> Kolpingwiese Ramsen</p>
        `)}
        <p style="font-size:16px;color:#2d2d2d;margin-top:20px;">Bis bald im Wasser! 🏊‍♂️💦</p>
        <p style="font-size:16px;color:#2d2d2d;">Dein <span style="color:#ff2d87;font-weight:bold;">Poolparty-Team</span></p>
      </td></tr>
    `),
  }),

  unregistrationSuccessful: (data: { name: string; itemName: string }): RenderedEmail => ({
    subject: 'Schade! 😢 Poolparty Abmeldung',
    html: wrap(`
      <tr><td style="padding:24px 32px;">
        <h1 style="color:#2d5da1;font-size:28px;margin:0 0 8px;">Schade, ${data.name}! 😢</h1>
        <p style="font-size:16px;color:#2d2d2d;">Deine Abmeldung von der Poolparty ist bestätigt.</p>
        ${card(`
          <p style="margin:0;font-size:15px;color:#2d2d2d;">Jetzt müssen wir uns selbst um <strong style="color:#ff2d87;">${data.itemName}</strong> kümmern... 😅</p>
        `)}
        <p style="font-size:16px;color:#2d2d2d;margin-top:20px;">Wir hoffen, dich nächstes Jahr wieder zu sehen! 🤞</p>
        <p style="font-size:16px;color:#2d2d2d;">Dein <span style="color:#ff2d87;font-weight:bold;">Poolparty-Team</span></p>
      </td></tr>
    `),
  }),

  registrationUpdate: (data: { name: string; changedFields: Record<string, string> }): RenderedEmail => ({
    subject: 'Update! ✏️ Poolparty Anmeldung aktualisiert',
    html: wrap(`
      <tr><td style="padding:24px 32px;">
        <h1 style="color:#2d5da1;font-size:28px;margin:0 0 8px;">Update erhalten! ✏️</h1>
        <p style="font-size:18px;color:#2d2d2d;">Hi <strong>${data.name}</strong>!</p>
        <p style="font-size:16px;color:#2d2d2d;">Deine Anmeldung wurde aktualisiert:</p>
        ${card(
          Object.entries(data.changedFields ?? {})
            .map(
              ([key, value]) =>
                `<p style="margin:4px 0;font-size:15px;color:#2d2d2d;">• <strong>${key}:</strong> ${value}</p>`
            )
            .join('')
        )}
        <p style="font-size:16px;color:#2d2d2d;margin-top:20px;">Dein <span style="color:#ff2d87;font-weight:bold;">Poolparty-Team</span></p>
      </td></tr>
    `),
  }),

  volunteerSuccessful: (data: { name: string; duration: string }): RenderedEmail => ({
    subject: 'Danke fürs Helfen! 💪 Volunteer bestätigt',
    html: wrap(`
      <tr><td style="padding:24px 32px;">
        <h1 style="color:#ff2d87;font-size:28px;margin:0 0 8px;">Danke fürs Helfen! 💪</h1>
        <p style="font-size:18px;color:#2d2d2d;">Hi <strong>${data.name}</strong>!</p>
        <p style="font-size:16px;color:#2d2d2d;">Mega, dass du uns unterstützt! Ohne Leute wie dich wäre die Poolparty nur ein Planschbecken. 😄</p>
        ${card(`
          <p style="margin:0 0 8px;font-size:14px;color:#888;">⏰ Dein Zeitraum:</p>
          <p style="margin:0;font-size:20px;color:#2d5da1;font-weight:bold;">${data.duration}</p>
        `)}
        ${postit(`
          <p style="margin:0;font-size:15px;color:#2d2d2d;">🎁 Als Dankeschön gibt's natürlich ein <strong>Helferpaket</strong>!</p>
        `)}
        <p style="font-size:16px;color:#2d2d2d;margin-top:20px;">Dein <span style="color:#ff2d87;font-weight:bold;">Poolparty-Team</span></p>
      </td></tr>
    `),
  }),

  unvolunteerSuccessful: (data: { name: string }): RenderedEmail => ({
    subject: 'Volunteer Abmeldung 😔',
    html: wrap(`
      <tr><td style="padding:24px 32px;">
        <h1 style="color:#2d5da1;font-size:28px;margin:0 0 8px;">Schade, ${data.name}! 😔</h1>
        <p style="font-size:16px;color:#2d2d2d;">Du hast dich als Volunteer abgemeldet.</p>
        ${card(`
          <p style="margin:0;font-size:15px;color:#2d2d2d;">Da wird dir wohl das <strong style="color:#ff2d87;">Helferpaket</strong> flöten gehen... 🎵</p>
        `)}
        <p style="font-size:16px;color:#2d2d2d;margin-top:20px;">Dein <span style="color:#ff2d87;font-weight:bold;">Poolparty-Team</span></p>
      </td></tr>
    `),
  }),

  adminNotification: (data: {
    name: string;
    people: number;
    itemName: string;
    music?: string | null;
  }): RenderedEmail => ({
    subject: `Neue Anmeldung! 📋 ${data.name}`,
    html: wrap(`
      <tr><td style="padding:24px 32px;">
        <h1 style="color:#ff2d87;font-size:28px;margin:0 0 8px;">Neue Anmeldung! 📋</h1>
        ${card(`
          <p style="margin:0 0 8px;font-size:15px;color:#2d2d2d;">👤 <strong>Name:</strong> ${data.name}</p>
          <p style="margin:0 0 8px;font-size:15px;color:#2d2d2d;">👥 <strong>Personen:</strong> ${data.people}</p>
          <p style="margin:0;font-size:15px;color:#2d2d2d;">📦 <strong>Bringt mit:</strong> ${data.itemName}</p>
          ${data.music ? `<p style="margin:8px 0 0;font-size:15px;color:#2d2d2d;">🎵 <strong>Musik:</strong> ${data.music}</p>` : ''}
        `)}
      </td></tr>
    `),
  }),

  passwordReset: (data: { url: string }): RenderedEmail => ({
    subject: 'Passwort zurücksetzen 🔑',
    html: wrap(`
      <tr><td style="padding:24px 32px;">
        <h1 style="color:#2d5da1;font-size:28px;margin:0 0 8px;">Passwort zurücksetzen 🔑</h1>
        <p style="font-size:16px;color:#2d2d2d;">Klicke auf den Button um dein Passwort zurückzusetzen (gültig für 1 Stunde):</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${data.url}" style="display:inline-block;background:#ff2d87;color:#fff;font-size:18px;font-weight:bold;padding:14px 36px;border-radius:12px 4px 12px 4px;border:3px solid #2d2d2d;box-shadow:4px 4px 0px 0px #2d2d2d;text-decoration:none;font-family:'Comic Neue','Segoe Print',cursive,sans-serif;">Passwort zurücksetzen</a>
        </div>
        <p style="font-size:13px;color:#888;">Oder kopiere diesen Link: ${data.url}</p>
        <p style="font-size:16px;color:#2d2d2d;margin-top:20px;">Dein <span style="color:#ff2d87;font-weight:bold;">Poolparty-Team</span></p>
      </td></tr>
    `),
  }),

  emailVerification: (data: { name: string; url: string }): RenderedEmail => ({
    subject: 'Bestätige deine E-Mail 📧',
    html: wrap(`
      <tr><td style="padding:24px 32px;">
        <h1 style="color:#ff2d87;font-size:28px;margin:0 0 8px;">Willkommen, ${data.name}! 👋</h1>
        <p style="font-size:16px;color:#2d2d2d;">Bitte bestätige deine E-Mail-Adresse, damit wir dich erreichen können (Link gültig für 24 Stunden):</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${data.url}" style="display:inline-block;background:#ff2d87;color:#fff;font-size:18px;font-weight:bold;padding:14px 36px;border-radius:12px 4px 12px 4px;border:3px solid #2d2d2d;box-shadow:4px 4px 0px 0px #2d2d2d;text-decoration:none;font-family:'Comic Neue','Segoe Print',cursive,sans-serif;">E-Mail bestätigen</a>
        </div>
        <p style="font-size:13px;color:#888;">Oder kopiere diesen Link: ${data.url}</p>
        <p style="font-size:16px;color:#2d2d2d;margin-top:20px;">Dein <span style="color:#ff2d87;font-weight:bold;">Poolparty-Team</span></p>
      </td></tr>
    `),
  }),
} as const;
