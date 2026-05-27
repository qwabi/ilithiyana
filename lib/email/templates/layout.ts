import { brand, contact } from '@/lib/site-config';

const DEEP_BLUE = 'hsl(210, 100%, 25%)';
const GOLD = 'hsl(43, 74%, 49%)';

export function emailLayout(opts: {
  headline: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaHref?: string;
}): string {
  const cta =
    opts.ctaLabel && opts.ctaHref
      ? `<p style="margin:28px 0 0;">
  <a href="${opts.ctaHref}" style="display:inline-block;background:${GOLD};color:#1a1a1a;font-family:'Plus Jakarta Sans',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:999px;">${opts.ctaLabel}</a>
</p>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Plus Jakarta Sans',Helvetica,Arial,sans-serif;color:#334155;font-size:16px;line-height:1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;">
        <tr><td style="padding:32px 28px;">
          <p style="margin:0 0 8px;font-family:'DM Serif Display',Georgia,serif;font-size:26px;color:${DEEP_BLUE};">${brand.name}</p>
          <h1 style="margin:0 0 20px;font-family:'DM Serif Display',Georgia,serif;font-size:22px;font-weight:400;color:${DEEP_BLUE};">${opts.headline}</h1>
          ${opts.bodyHtml}
          ${cta}
          <p style="margin:32px 0 0;font-size:13px;color:#64748b;">Questions? <a href="mailto:${contact.email}" style="color:${DEEP_BLUE};">${contact.email}</a> · ${contact.phone}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
