import crypto from "crypto";
import { packages } from "@/lib/site-config";

export function getPayfastConfig() {
  const sandbox = process.env.PAYFAST_SANDBOX !== "false";
  return {
    merchantId: process.env.PAYFAST_MERCHANT_ID || "",
    merchantKey: process.env.PAYFAST_MERCHANT_KEY || "",
    passphrase: process.env.PAYFAST_PASSPHRASE || "",
    sandbox,
    processUrl: sandbox
      ? "https://sandbox.payfast.co.za/eng/process"
      : "https://www.payfast.co.za/eng/process",
  };
}

export function getProcessUrl(): string {
  return getPayfastConfig().processUrl;
}

export function isPayfastConfigured(): boolean {
  const { merchantId, merchantKey } = getPayfastConfig();
  return Boolean(merchantId && merchantKey);
}

/**
 * PayFast checkout signature field order (NOT alphabetical).
 * merchant_key must be included — it is posted in the form and PayFast hashes it.
 * @see https://developers.payfast.co.za/docs#step_2_signature
 */
const CHECKOUT_SIGNATURE_FIELD_ORDER = [
  "merchant_id",
  "merchant_key",
  "return_url",
  "cancel_url",
  "notify_url",
  "name_first",
  "name_last",
  "email_address",
  "cell_number",
  "m_payment_id",
  "amount",
  "item_name",
  "item_description",
  "custom_int1",
  "custom_int2",
  "custom_int3",
  "custom_int4",
  "custom_int5",
  "custom_str1",
  "custom_str2",
  "custom_str3",
  "custom_str4",
  "custom_str5",
  "email_confirmation",
  "confirmation_address",
  "payment_method",
  "subscription_type",
  "billing_date",
  "recurring_amount",
  "frequency",
  "cycles",
] as const;

function buildSignatureQuery(
  data: Record<string, string>,
  fieldOrder: readonly string[],
  passphrase?: string,
): { query: string; queryForLog: string; fieldKeys: string[] } {
  const parts: string[] = [];
  const fieldKeys: string[] = [];
  for (const key of fieldOrder) {
    const val = data[key];
    if (val === undefined || val === "") continue;
    fieldKeys.push(key);
    parts.push(`${key}=${payfastUrlEncode(val)}`);
  }
  const query = parts.join("&");
  const pass = passphrase?.trim();
  const passPart = pass ? `&passphrase=${payfastUrlEncode(pass)}` : "";
  const full = `${query}${passPart}`;
  return {
    query: full,
    queryForLog: pass ? `${query}&passphrase=***` : query,
    fieldKeys,
  };
}

function md5Hex(input: string): string {
  return crypto.createHash("md5").update(input).digest("hex");
}

/**
 * PHP-compatible urlencode (PayFast server-side), not raw encodeURIComponent.
 * encodeURIComponent leaves ( ) unencoded; PayFast hashes %28 %29 instead.
 */
export function payfastUrlEncode(value: string): string {
  return encodeURIComponent(value.trim())
    .replace(/%20/g, "+")
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A")
    .replace(/~/g, "%7E")
    .replace(/%([0-9a-f]{2})/gi, (_, hex: string) => `%${hex.toUpperCase()}`);
}

/** PayFast hosted checkout MD5 signature (document field order, not API alphabetical). */
export function buildPayfastSignature(
  data: Record<string, string>,
  passphrase?: string,
): string {
  const { query } = buildSignatureQuery(
    data,
    CHECKOUT_SIGNATURE_FIELD_ORDER,
    passphrase,
  );
  return md5Hex(query);
}

export function packageAmountCents(packageId: string): number {
  const pkg = packages.find((p) => p.id === packageId);
  return pkg?.amountCents ?? 100000;
}

export function packageItemName(packageId: string): string {
  const pkg = packages.find((p) => p.id === packageId);
  return pkg
    ? `${pkg.name} - Ilithiyana Academics`
    : "Ilithiyana Academics enrolment";
}

export type PayfastSubscriptionOpts = {
  subscriptionType: "1";
  frequency: "3";
  cycles: "0";
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
    data.billing_date = opts.subscription.billingDate;
    data.frequency = opts.subscription.frequency;
    data.cycles = opts.subscription.cycles;
  }

  const pass = passphrase?.trim() || undefined;
  data.signature = buildPayfastSignature(data, pass);
  return data;
}

export function payfastBillingDateToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseAmountGrossToCents(
  amountGross: string | undefined,
): number | null {
  if (!amountGross) return null;
  const n = Number.parseFloat(amountGross.replace(",", "."));
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100);
}
