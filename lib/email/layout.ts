import { brand, contact } from '@/lib/site-config';

export function emailLayout(body: string): string {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || brand.siteUrl;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;">
          <tr>
            <td style="padding:28px 28px 8px;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#003366;">${brand.name}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;color:#1e293b;font-size:16px;line-height:1.6;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px;font-size:13px;color:#64748b;line-height:1.5;">
              <p style="margin:0 0 8px;">${brand.legalName} · Reg. ${brand.registrationNumber}</p>
              <p style="margin:0;">
                <a href="mailto:${contact.email}" style="color:#0066cc;">${contact.email}</a>
                · <a href="${site}" style="color:#0066cc;">${site.replace(/^https?:\/\//, '')}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
