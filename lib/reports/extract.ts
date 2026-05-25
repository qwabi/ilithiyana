import { percentageToBand, percentageToLevel } from '@/lib/reports/nsc';
import { normalizeSubjectName } from '@/lib/reports/subjects';

export type ExtractedSubjectRow = {
  subject_name_raw: string;
  subject_name_clean: string;
  percentage: number | null;
  level: number | null;
  term: string;
  confidence: number;
  needs_review: boolean;
  is_offered: boolean;
  band: string | null;
};

const DEFAULT_TERM = 'Year End';

export async function extractSubjectsFromOcrText(
  ocrText: string
): Promise<ExtractedSubjectRow[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return manualFallbackRows(ocrText);
  }

  const prompt = `You are extracting academic results from a South African school report.
The text below was extracted via OCR from a scanned report card and may contain errors.
Extract all subject names and their percentage marks or level codes. Return a JSON array only, no explanation.

For each subject return:
{ "subject_name_raw", "subject_name_clean", "percentage", "level", "term", "confidence" }

Use the NSC grading scale to derive level from percentage if needed:
80-100 = 7, 70-79 = 6, 60-69 = 5, 50-59 = 4, 40-49 = 3, 30-39 = 2, 0-29 = 1

If a value cannot be determined with confidence, set it to null and set needs_review to true.

Raw OCR text:
${ocrText.slice(0, 12000)}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_EXTRACT_MODEL ?? 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    console.error('Extract LLM error:', await res.text());
    return manualFallbackRows(ocrText);
  }

  const json = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = json.content?.find((c) => c.type === 'text')?.text ?? '[]';
  const parsed = parseJsonArray(text);
  return parsed.map(enrichRow);
}

function parseJsonArray(text: string): Record<string, unknown>[] {
  const trimmed = text.trim();
  const start = trimmed.indexOf('[');
  const end = trimmed.lastIndexOf(']');
  if (start === -1 || end === -1) return [];
  try {
    const arr = JSON.parse(trimmed.slice(start, end + 1)) as unknown;
    return Array.isArray(arr) ? (arr as Record<string, unknown>[]) : [];
  } catch {
    return [];
  }
}

function enrichRow(raw: Record<string, unknown>): ExtractedSubjectRow {
  const subjectRaw = String(raw.subject_name_raw ?? raw.subject ?? 'Unknown');
  const { clean, isOffered } = normalizeSubjectName(
    String(raw.subject_name_clean ?? subjectRaw)
  );
  let percentage: number | null = null;
  if (typeof raw.percentage === 'number') percentage = raw.percentage;
  else if (raw.percentage != null) {
    const n = parseFloat(String(raw.percentage).replace('%', ''));
    if (!Number.isNaN(n)) percentage = n;
  }

  let level: number | null = null;
  if (typeof raw.level === 'number') level = raw.level;
  else if (raw.level != null) {
    const n = parseInt(String(raw.level), 10);
    if (!Number.isNaN(n)) level = n;
  }

  if (percentage != null && level == null) {
    level = percentageToLevel(percentage);
  }

  const confidence =
    typeof raw.confidence === 'number'
      ? raw.confidence
      : raw.needs_review === true
        ? 0.5
        : 0.9;

  const needsReview =
    Boolean(raw.needs_review) ||
    confidence < 0.85 ||
    percentage == null ||
    level == null;

  const band =
    percentage != null
      ? percentageToBand(percentage)
      : level != null
        ? percentageToBand(level * 14)
        : null;

  return {
    subject_name_raw: subjectRaw,
    subject_name_clean: clean,
    percentage,
    level,
    term: String(raw.term ?? DEFAULT_TERM),
    confidence,
    needs_review: needsReview,
    is_offered: isOffered,
    band,
  };
}

/** Regex fallback when LLM unavailable */
function manualFallbackRows(ocrText: string): ExtractedSubjectRow[] {
  const lines = ocrText.split(/\n/);
  const rows: ExtractedSubjectRow[] = [];
  const pctRe = /(\d{1,3})\s*%/;

  for (const line of lines) {
    const m = line.match(pctRe);
    if (!m) continue;
    const pct = Math.min(100, parseInt(m[1], 10));
    const namePart = line.replace(pctRe, '').trim();
    if (namePart.length < 2) continue;
    rows.push(enrichRow({
      subject_name_raw: namePart,
      percentage: pct,
      confidence: 0.6,
      needs_review: true,
    }));
  }
  return rows;
}
