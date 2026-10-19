// Polyfill standard browser globals for pdfjs-dist in Bun/Node runtime environments
if (typeof (globalThis as Record<string, unknown>).DOMMatrix === "undefined") {
  (globalThis as Record<string, unknown>).DOMMatrix = class DOMMatrix {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
    m11 = 1;
    m12 = 0;
    m13 = 0;
    m14 = 0;
    m21 = 0;
    m22 = 1;
    m23 = 0;
    m24 = 0;
    m31 = 0;
    m32 = 0;
    m33 = 1;
    m34 = 0;
    m41 = 0;
    m42 = 0;
    m43 = 0;
    m44 = 1;
    is2D = true;
    isIdentity = true;
  };
}
if (typeof (globalThis as Record<string, unknown>).Path2D === "undefined") {
  (globalThis as Record<string, unknown>).Path2D = class Path2D {};
}
if (typeof (globalThis as Record<string, unknown>).ImageData === "undefined") {
  (globalThis as Record<string, unknown>).ImageData = class ImageData {};
}

import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";

export const extractedInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1).describe("Invoice or bill reference number"),
  counterparty: z.string().min(1).describe("Customer or supplier/vendor name"),
  type: z
    .enum(["RECEIVABLE", "PAYABLE"])
    .describe(
      "RECEIVABLE for customer invoice (inflow), PAYABLE for vendor/supplier bill (outflow)",
    ),
  issueDate: z
    .string()
    .nullable()
    .optional()
    .transform((val) => val || new Date().toISOString().slice(0, 10))
    .describe("Issue date in YYYY-MM-DD format"),
  dueDate: z
    .string()
    .nullable()
    .optional()
    .transform(
      (val) =>
        val || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    )
    .describe("Due date in YYYY-MM-DD format"),
  totalAmount: z.number().positive().describe("Total invoice amount"),
  currency: z.string().default("BDT"),
  confidenceScore: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence score between 0.00 and 1.00"),
  confidenceRationale: z
    .string()
    .optional()
    .describe("Notes explaining any missing or ambiguous fields"),
});

export type ExtractedInvoice = z.infer<typeof extractedInvoiceSchema>;

/**
 * Extracts raw textual content from an in-memory PDF buffer without disk writes.
 * Uses unpdf for serverless-safe execution without external worker file dependencies.
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const { getDocumentProxy, extractText } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return (text || "").trim();
  } catch (err) {
    console.warn("Failed to extract text from PDF with unpdf:", err);
    return "";
  }
}

/**
 * Heuristic rule-based extractor used as fallback when LLM API keys are unavailable or rate-limited.
 */
export function extractHeuristic(text: string): ExtractedInvoice {
  let invoiceNumber = "";
  let counterparty = "Unknown Counterparty";
  let type: "RECEIVABLE" | "PAYABLE" = "RECEIVABLE";
  let issueDate = new Date().toISOString().slice(0, 10);
  let dueDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  let totalAmount = 0;
  let currency = "BDT";

  let confidenceScore = 0.5;
  const missingFields: string[] = [];

  // Match Invoice Number
  const invMatch =
    text.match(
      /(?:invoice|bill|inv|supplier\s+bill|freight\s+bill)(?:\s*(?:ref|id|#|number|no\.?))?[^\S\r\n]*[:#][^\S\r\n]*([A-Za-z0-9_-]+)/i,
    ) || text.match(/#\s*([A-Za-z0-9_-]+)/);
  if (invMatch?.[1] && invMatch[1].length > 2) {
    invoiceNumber = invMatch[1].trim();
    confidenceScore += 0.15;
  } else {
    invoiceNumber = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
    missingFields.push("invoiceNumber");
  }

  // Detect Counterparty
  const cpMatch =
    text.match(
      /(?:billed\s+to|bill\s+to|client|consignee|tenant|healthcare\s+client|buyer|customer|subscriber)(?:\s*\/[^\n\r:]*|\s*\([^)]*\))?[:\s]*\n?([^\n\r,]+)/i,
    ) || text.match(/(?:from|vendor|supplier)[:\s]*\n?([^\n\r,]+)/i);

  if (cpMatch?.[1] && cpMatch[1].trim().length > 2) {
    counterparty = cpMatch[1].trim().replace(/^\W+|\W+$/g, "");
    confidenceScore += 0.15;
  } else {
    missingFields.push("counterparty");
  }

  // Detect Type
  if (/\(RECEIVABLE\)/i.test(text) || /BILLED TO \(CUSTOMER\)/i.test(text)) {
    type = "RECEIVABLE";
  } else if (
    /\(PAYABLE\)/i.test(text) ||
    /VENDOR BILL/i.test(text) ||
    /STATEMENT OF RENT/i.test(text) ||
    /FREIGHT BILL/i.test(text)
  ) {
    type = "PAYABLE";
  } else if (
    /vendor|supplier|payable|purchase\s+order/i.test(text) &&
    !/customer|client/i.test(text)
  ) {
    type = "PAYABLE";
  } else {
    type = "RECEIVABLE";
  }

  // Detect Dates
  const dueMatch = text.match(
    /(?:due\s+date|delivery\s+due\s+date|payment\s+due)[:\s]*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/i,
  );
  if (dueMatch?.[1]) {
    dueDate = dueMatch[1].replace(/\//g, "-");
    confidenceScore += 0.05;
  }

  const issueMatch = text.match(
    /(?:issue\s+date|order\s+date|booking\s+date|date)[:\s]*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/i,
  );
  if (issueMatch?.[1]) {
    issueDate = issueMatch[1].replace(/\//g, "-");
    confidenceScore += 0.1;
  } else {
    const generalDate = text.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})/);
    if (generalDate?.[1]) {
      issueDate = generalDate[1].replace(/\//g, "-");
      confidenceScore += 0.05;
    } else {
      missingFields.push("issueDate");
    }
  }

  // Detect Total Amount
  const amountMatches = text.matchAll(
    /(?:total\s+due|total\s+payable(?:\s+amount|\s+by\s+due\s+date)?|net\s+total(?:\s+payable)?|total\s+invoice\s+value|payable\s+amount|amount\s+payable|total)[\s:]*(?:[৳$€£]|BDT|USD|EUR)?\s*([\d,]+(?:\.\d{2})?)/gi,
  );
  let foundAmt = 0;
  for (const m of amountMatches) {
    if (m[1]) {
      const parsed = Number.parseFloat(m[1].replace(/,/g, ""));
      if (!Number.isNaN(parsed) && parsed > foundAmt) {
        foundAmt = parsed;
      }
    }
  }

  if (foundAmt > 0) {
    totalAmount = foundAmt;
    confidenceScore += 0.2;
  } else {
    const allAmounts = text.matchAll(
      /(?:BDT|USD|EUR|GBP|৳)\s*([\d,]+(?:\.\d{2})?)/gi,
    );
    for (const m of allAmounts) {
      const parsed = Number.parseFloat(m[1].replace(/,/g, ""));
      if (!Number.isNaN(parsed) && parsed > totalAmount) {
        totalAmount = parsed;
      }
    }
    if (totalAmount > 0) {
      confidenceScore += 0.1;
    } else {
      totalAmount = 10000;
      missingFields.push("totalAmount");
    }
  }

  // Detect Currency
  if (/[$]|USD/i.test(text)) currency = "USD";
  else if (/[€]|EUR/i.test(text)) currency = "EUR";
  else if (/[£]|GBP/i.test(text)) currency = "GBP";
  else currency = "BDT";

  confidenceScore = Math.min(0.95, Math.max(0.2, confidenceScore));
  const confidenceRationale =
    missingFields.length > 0
      ? `Inferred via deterministic heuristic parser. Unverified or estimated fields: ${missingFields.join(", ")}.`
      : "Extracted via deterministic heuristic parser with complete pattern matches.";

  return {
    invoiceNumber,
    counterparty,
    type,
    issueDate,
    dueDate,
    totalAmount,
    currency,
    confidenceScore: Math.round(confidenceScore * 100) / 100,
    confidenceRationale,
  };
}

/**
 * Extracts structured invoice metadata from raw text or base64 using Gemini 3.8 Flash (@google/genai),
 * with deterministic heuristic fallback when Gemini API key is unavailable or rate-limited.
 */
export async function extractInvoiceFromDocument(params: {
  rawText?: string;
  fileBase64?: string;
  mimeType?: string;
}): Promise<ExtractedInvoice> {
  const { rawText = "", fileBase64, mimeType = "application/pdf" } = params;
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `You are an expert financial document parser for CashPilot AI. Extract invoice metadata from the provided document accurately according to the JSON schema.

Document Text Content:
"""
${rawText.slice(0, 12000)}
"""`;

      const contents: Array<
        { text: string } | { inlineData: { data: string; mimeType: string } }
      > = [{ text: prompt }];

      if (
        fileBase64 &&
        (mimeType.startsWith("image/") || mimeType === "application/pdf")
      ) {
        contents.push({
          inlineData: {
            data: fileBase64,
            mimeType,
          },
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              invoiceNumber: {
                type: Type.STRING,
                description: "Invoice or bill reference number",
              },
              counterparty: {
                type: Type.STRING,
                description: "Customer or supplier/vendor name",
              },
              type: {
                type: Type.STRING,
                enum: ["RECEIVABLE", "PAYABLE"],
                description:
                  "RECEIVABLE for customer invoice (inflow), PAYABLE for vendor/supplier bill (outflow)",
              },
              issueDate: {
                type: Type.STRING,
                description: "Issue date in YYYY-MM-DD format",
              },
              dueDate: {
                type: Type.STRING,
                description: "Due date in YYYY-MM-DD format",
              },
              totalAmount: {
                type: Type.NUMBER,
                description: "Total invoice amount as a numeric float",
              },
              currency: {
                type: Type.STRING,
                description: "Currency code (BDT, USD, EUR, GBP)",
              },
              confidenceScore: {
                type: Type.NUMBER,
                description: "Confidence score between 0.00 and 1.00",
              },
              confidenceRationale: {
                type: Type.STRING,
                description:
                  "Explanation if any field is missing, ambiguous, or estimated",
              },
            },
            required: [
              "invoiceNumber",
              "counterparty",
              "type",
              "totalAmount",
              "confidenceScore",
            ],
          },
          temperature: 0.1,
        },
      });

      const responseText = response.text || "";
      const parsedJson = JSON.parse(responseText);
      const validated = extractedInvoiceSchema.safeParse(parsedJson);

      if (validated.success) {
        return validated.data;
      }
      console.warn(
        "Gemini extraction schema validation warning:",
        validated.error,
      );
    } catch (err) {
      console.warn(
        "Gemini 3.5 Flash extraction failed, attempting Groq fallback:",
        err,
      );
    }
  }

  // Secondary LLM: Groq (via open-source fast models like llama-3.3-70b-versatile or llama-3.2-11b-vision-preview)
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey) {
    try {
      const isImage = Boolean(fileBase64 && mimeType.startsWith("image/"));
      const systemInstruction = `You are a financial document parser for CashPilot AI. Extract invoice data into JSON matching this exact schema:
{
  "invoiceNumber": "string",
  "counterparty": "string (customer or supplier name)",
  "type": "RECEIVABLE" or "PAYABLE",
  "issueDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "totalAmount": number,
  "currency": "BDT", "USD", "EUR", or "GBP",
  "confidenceScore": float between 0.00 and 1.00 reflecting extraction certainty,
  "confidenceRationale": "brief explanation if any field is missing, blurry, or ambiguous"
}`;

      const messages: Array<{
        role: "system" | "user";
        content:
          | string
          | Array<{ type: string; text?: string; image_url?: { url: string } }>;
      }> = [
        {
          role: "system",
          content: systemInstruction,
        },
      ];

      if (isImage) {
        messages.push({
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract invoice data from this image invoice into JSON matching the schema.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${fileBase64}`,
              },
            },
          ],
        });
      } else {
        messages.push({
          role: "user",
          content: `Document Text Content:\n"""\n${rawText.slice(0, 8000)}\n"""`,
        });
      }

      const groqRes = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: isImage
              ? "llama-3.2-11b-vision-preview"
              : "llama-3.3-70b-versatile",
            messages,
            response_format: { type: "json_object" },
            temperature: 0.1,
          }),
        },
      );

      if (groqRes.ok) {
        const groqData = await groqRes.json();
        const content = groqData.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          const validated = extractedInvoiceSchema.safeParse(parsed);
          if (validated.success) {
            return validated.data;
          }
        }
      } else {
        console.warn("Groq API error response:", groqRes.status);
      }
    } catch (groqErr) {
      console.warn("Groq failover extraction failed:", groqErr);
    }
  }

  // Deterministic fallback parser
  return extractHeuristic(rawText);
}
