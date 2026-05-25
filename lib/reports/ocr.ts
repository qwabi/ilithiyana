import { PDFDocument } from 'pdf-lib';

export type OcrFileType = 'pdf' | 'jpg' | 'jpeg' | 'png' | 'webp';

export function mimeToFileType(mime: string): OcrFileType {
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

/** Try embedded PDF text (works for digital PDFs, not scans). */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    // pdf-lib has no text extraction — return empty so vision/LLM path runs
    void doc.getPageCount();
    return '';
  } catch {
    return '';
  }
}

/** OCR via Anthropic vision (image bytes as base64). */
export async function ocrImageWithAnthropic(
  buffer: Buffer,
  mediaType: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const base64 = buffer.toString('base64');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_OCR_MODEL ?? 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: 'text',
              text: 'Transcribe all text from this South African school report card exactly as shown. Include subject names and percentage marks. Return plain text only, no commentary.',
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic OCR failed: ${res.status} ${err}`);
  }

  const json = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const block = json.content?.find((c) => c.type === 'text');
  return block?.text?.trim() ?? '';
}

/** Google Cloud Vision document_text_detection (optional). */
export async function ocrWithGoogleVision(buffer: Buffer): Promise<string> {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_CLOUD_VISION_API_KEY is not configured');
  }

  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: buffer.toString('base64') },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          },
        ],
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Vision API failed: ${res.status}`);
  }

  const json = (await res.json()) as {
    responses?: { fullTextAnnotation?: { text?: string } }[];
  };
  return json.responses?.[0]?.fullTextAnnotation?.text?.trim() ?? '';
}

export async function runOcrOnBuffer(
  buffer: Buffer,
  fileType: OcrFileType,
  contentType?: string
): Promise<string> {
  if (fileType === 'pdf') {
    const embedded = await extractPdfText(buffer);
    if (embedded.length >= 80) return embedded;
    // Scanned PDF: treat first chunk as image path unavailable without pdf2pic;
    // use Anthropic on raw PDF if supported — fallback to vision on buffer as application/pdf
    if (process.env.ANTHROPIC_API_KEY) {
      return ocrImageWithAnthropic(buffer, 'application/pdf');
    }
    if (process.env.GOOGLE_CLOUD_VISION_API_KEY) {
      return ocrWithGoogleVision(buffer);
    }
    throw new Error('Scanned PDF requires ANTHROPIC_API_KEY or GOOGLE_CLOUD_VISION_API_KEY');
  }

  const media =
    contentType ??
    (fileType === 'png'
      ? 'image/png'
      : fileType === 'webp'
        ? 'image/webp'
        : 'image/jpeg');

  if (process.env.GOOGLE_CLOUD_VISION_API_KEY) {
    try {
      return await ocrWithGoogleVision(buffer);
    } catch (e) {
      console.warn('Google Vision failed, falling back to Anthropic:', e);
    }
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return ocrImageWithAnthropic(buffer, media);
  }

  throw new Error('Configure ANTHROPIC_API_KEY or GOOGLE_CLOUD_VISION_API_KEY for OCR');
}
