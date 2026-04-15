import { sql } from 'drizzle-orm';
import { db, schema } from './client.js';
import { logger } from '../services/logger.js';

const { mailDraft } = schema;

const PINK = '#ff2d87';
const BLUE = '#2d5da1';
const PENCIL = '#2d2d2d';
const PAPER = '#fdfbf7';
const POSTIT = '#ffe4f1';
const BG = '#e8e4df';
const FONT = "'Comic Neue','Segoe Print','Comic Sans MS',cursive,sans-serif";

function wrap(content: string): string {
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BG};font-family:${FONT};">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${PAPER};border:3px solid ${PENCIL};border-radius:18px 4px 18px 4px;box-shadow:6px 6px 0px 0px ${PENCIL};overflow:hidden;">
  <tr><td style="padding:0;">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 120" style="width:100%;height:auto;display:block;">
      <rect width="600" height="120" fill="${PINK}"/>
      <text x="300" y="38" text-anchor="middle" font-size="14" fill="#fff" font-family="${FONT}" opacity="0.6">〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️</text>
      <text x="300" y="72" text-anchor="middle" font-size="34" font-weight="bold" fill="#fff" font-family="${FONT}">🏊 SAVE THE DATE 🌊</text>
      <text x="300" y="98" text-anchor="middle" font-size="20" font-weight="bold" fill="#fff" font-family="${FONT}" opacity="0.95">Poolparty 2026</text>
      <text x="300" y="114" text-anchor="middle" font-size="12" fill="#fff" font-family="${FONT}" opacity="0.55">〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️</text>
    </svg>
  </td></tr>
  ${content}
  <tr><td style="padding:32px 24px 28px;text-align:center;font-size:13px;color:#888;font-family:${FONT};">
    🏊 Poolparty 2026 · Kolpingwiese Ramsen 🌊<br>
    <span style="font-size:11px;color:#bbb;">Diese E-Mail wurde vom Poolparty-Team handgebastelt.</span><br>
    <span style="font-size:11px;color:#bbb;">Offizielle Anmeldung folgt bald auf <a href="https://poolparty.jupeters.de" style="color:${PINK};text-decoration:none;font-weight:bold;">poolparty.jupeters.de</a></span>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

function card(html: string, style = ''): string {
  return `<div style="background:#fff;border:2px solid ${PENCIL};border-radius:12px 4px 12px 4px;box-shadow:4px 4px 0px 0px ${PENCIL};padding:18px;margin:10px 0;${style}">${html}</div>`;
}

function postit(html: string): string {
  return `<div style="background:${POSTIT};border:2px solid ${PENCIL};border-radius:4px 12px 4px 12px;box-shadow:4px 4px 0px 0px ${PENCIL};padding:16px;margin:12px 0;transform:rotate(-1deg);">${html}</div>`;
}

const TEASER_HTML = wrap(`
  <tr><td style="padding:28px 32px 8px;">
    <h1 style="color:${PINK};font-size:30px;margin:0 0 6px;font-family:${FONT};">Es ist wieder soweit.</h1>
    <p style="font-size:17px;color:${PENCIL};margin:0 0 18px;line-height:1.55;">
      Die Sonne macht gerade noch ein paar Überstunden im Süden, aber keine Sorge:
      <strong>2026 kehrt sie pünktlich zurück</strong> — und zwar genau dorthin, wo sie hingehört.
      Auf die Kolpingwiese. Über den Pool. Auf eure Nasen. 🌞
    </p>

    ${postit(`
      <p style="margin:0;font-size:17px;color:${PENCIL};"><strong>📅 Wann?</strong> Samstag, <strong>27. Juni 2026</strong>, ab 16:00 Uhr</p>
      <p style="margin:6px 0 0;font-size:17px;color:${PENCIL};"><strong>📍 Wo?</strong> Kolpingwiese Ramsen, Klosterhof 7</p>
      <p style="margin:6px 0 0;font-size:15px;color:#777;">(Wetter ist optional. Laune ist Pflicht.)</p>
    `)}

    <h2 style="color:${BLUE};font-size:22px;margin:26px 0 8px;font-family:${FONT};">Was wir bisher bestätigen können ☑️</h2>

    ${card(`
      <table width="100%" cellpadding="0" cellspacing="0" style="font-family:${FONT};">
        <tr>
          <td style="width:48%;padding:8px;vertical-align:top;">
            <div style="font-size:28px;">🎧</div>
            <div style="font-size:16px;color:${PENCIL};font-weight:bold;margin-top:4px;">DJ Jesus</div>
            <div style="font-size:13px;color:#888;">legt wieder auf - auf dem Wasser gehen muss er nicht, Lautstärke reicht</div>
          </td>
          <td style="width:4%;"></td>
          <td style="width:48%;padding:8px;vertical-align:top;">
            <div style="font-size:28px;">🏊</div>
            <div style="font-size:16px;color:${PENCIL};font-weight:bold;margin-top:4px;">Der Pool</div>
            <div style="font-size:13px;color:#888;">ist noch leer, fühlt sich aber schon jetzt erfrischend an</div>
          </td>
        </tr>
        <tr>
          <td style="padding:8px;vertical-align:top;">
            <div style="font-size:28px;">🍹</div>
            <div style="font-size:16px;color:${PENCIL};font-weight:bold;margin-top:4px;">Drinks</div>
            <div style="font-size:13px;color:#888;">wir haben aus den Fehlern der Vorjahre gelernt. Vermutlich.</div>
          </td>
          <td></td>
          <td style="padding:8px;vertical-align:top;">
            <div style="font-size:28px;">🎸</div>
            <div style="font-size:16px;color:${PENCIL};font-weight:bold;margin-top:4px;">Don't tell the others</div>
            <div style="font-size:13px;color:#888;">die Band, die ihren Namen wirklich ernst meint</div>
          </td>
        </tr>
      </table>
    `)}

    <h2 style="color:${BLUE};font-size:22px;margin:26px 0 8px;font-family:${FONT};">Was ihr jetzt schon tun könnt 🧰</h2>

    <ol style="font-size:16px;color:${PENCIL};line-height:1.7;padding-left:22px;margin:8px 0 18px;">
      <li><strong>04.07.2026</strong> rot im Kalender markieren. Mit echtem Filzstift. Keine digitalen Erinnerungen, die will keiner.</li>
      <li>Eine Badehose suchen, die euch letztes Jahr nicht komplett blamiert hat.</li>
      <li>Die Freunde warnen, die <em>weder</em> auf diesem Verteiler sind <em>noch</em> eingeladen werden wollen. Also gar keine.</li>
      <li>Diese Mail nicht löschen. Die Anmeldung kommt bald.</li>
    </ol>

    ${postit(`
      <p style="margin:0;font-size:16px;color:${PENCIL};">
        🎟️ <strong>Offizielle Anmeldung</strong> geht in Kürze online unter
        <a href="https://poolparty.jupeters.de" style="color:${PINK};font-weight:bold;text-decoration:none;">poolparty.jupeters.de</a>.
        Wie immer: <em>Jeder bringt was mit.</em> Der Kühlschrank ist nicht magisch.
      </p>
    `)}

    <p style="font-size:16px;color:${PENCIL};margin:24px 0 6px;">
      Bis dahin:<br>
      Frühlingsgefühle sammeln, Muskeln für den Pool-Sprung anspannen, Sonnenbrand-Fashion auswählen.
    </p>

    <p style="font-size:16px;color:${PENCIL};margin:0;">
      Wir freuen uns schon riesig auf euch. 🥳<br>
      Euer <span style="color:${PINK};font-weight:bold;">Poolparty-Team</span> 💦
    </p>
  </td></tr>`);

/**
 * Idempotent seed. Inserts the default Save-the-Date teaser draft if the
 * mail_draft table is empty. Logs but never throws on failure.
 */
export function seedMailDrafts(): void {
  try {
    const row = db
      .select({ c: sql<number>`count(*)` })
      .from(mailDraft)
      .get();
    if (row && row.c > 0) return;

    db.insert(mailDraft)
      .values({
        name: 'Save the Date 2026 (Teaser)',
        subject: '🏊 Save the Date: Poolparty 2026 💦',
        html: TEASER_HTML,
      })
      .run();

    logger.info('seeded default mail draft: Save the Date 2026 (Teaser)');
  } catch (err) {
    logger.warn({ err }, 'mail draft seeding failed (non-fatal)');
  }
}
