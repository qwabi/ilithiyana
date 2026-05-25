import crypto from 'crypto';
import { packages } from '@/lib/site-config';

export function getPayfastConfig() {
  const sandbox = process.env.PAYFAST_SANDBOX !== 'false';
  return {
    merchantId: process.env.PAYFAST_MERCHANT_ID || '',
    merchantKey: process.env.PAYFAST_MERCHANT_KEY || '',
    passphrase: process.env.PAYFAST_PASSPHRASE || '',
    sandbox,
    processUrl: sandbox
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process',
  };
}

export function getProcessUrl(): string {
  return getPayfastConfig().processUrl;
}

export function isPayfastConfigured(): boolean {
  const { merchantId, merchantKey } = getPayfastConfig();
  return Boolean(merchantId && merchantKey);
}

/** PayFast signature: sorted non-empty fields (excluding signature), URL-encoded, optional passphrase. */
export function buildPayfastSignature(
  data: Record<string, string>,
  passphrase?: string
): string {
  const ordered = Object.keys(data)
    .filter((k) => data[k] !== '' && k !== 'signature')
    .sort();
  const query = ordered
    .map((k) => `${k}=${encodeURIComponent(data[k]).replace(/%20/g, '+')}`)
    .join('&');
  const passPart = passphrase
    ? `&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`
    : '';
  return crypto.createHash('md5').update(`${query}${passPart}`).digest('hex');
}

export function packageAmountCents(packageId: string): number {
  const pkg = packages.find((p) => p.id === packageId);
  return pkg?.amountCents ?? 100000;
}

export function packageItemName(packageId: string): string {
  const pkg = packages.find((p) => p.id === packageId);
  return pkg ? `${pkg.name} — Ilithiyana Academics` : 'Ilithiyana Academics enrolment';
}

export type PayfastSubscriptionOpts = {
  subscriptionType: '1';
  frequency: '3';
  cycles: '0';
  billingDate: string;
};

export function buildPayfastFormFields(opts: {
  paymentId: string;
  amountCents: number;
  itemName: string;
  itemDescription?: string;
  email: string;
  nameFirst: string;
  nameLast: string;
  cellNumber: string;
  returnUrl: string;
  cancelUrl: string;
  customStr1?: string;
  customStr2?: string;
  subscription?: PayfastSubscriptionOpts;
}): Record<string, string> {
  const { merchantId, merchantKey, passphrase } = getPayfastConfig();
  const data: Record<string, string> = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: opts.returnUrl,
    cancel_url: opts.cancelUrl,
    name_first: opts.nameFirst,
    name_last: opts.nameLast,
    email_address: opts.email,
    cell_number: opts.cellNumber,
    m_payment_id: opts.paymentId,
    amount: (opts.amountCents / 100).toFixed(2),
    item_name: opts.itemName,
  };

  if (opts.itemDescription) {
    data.item_description = opts.itemDescription;
  }

  if (opts.customStr1) {
    data.custom_str1 = opts.customStr1;
  }
  if (opts.customStr2) {
    data.custom_str2 = opts.customStr2;
  }

  if (opts.subscription) {
    data.subscription_type = opts.subscription.subscriptionType;
    data.frequency = opts.subscription.frequency;
    data.cycles = opts.subscription.cycles;
    data.billing_date = opts.subscription.billingDate;
  }

  data.signature = buildPayfastSignature(data, passphrase || undefined);
  return data;
}

export function payfastBillingDateToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseAmountGrossToCents(amountGross: string | undefined): number | null {
  if (!amountGross) return null;
  const n = Number.parseFloat(amountGross.replace(',', '.'));
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100);
}
