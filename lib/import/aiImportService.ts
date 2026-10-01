import { z } from "zod";
import type { Customer } from "@/types/customer.type";
import type { BulkSavePayload } from "@/types/tiffin.type";
import { parseRawEntryText } from "@/lib/import/aiEntryParser";
import { normalizeCustomerName } from "@/lib/import/customerMatcher";
import { bulkSaveSchema } from "@/lib/validations/tiffin-entry.validation";

const AiExtraItemSchema = z.object({
    item: z.string().min(1).max(50),
    qty: z.number().int().min(0).max(50),
    price: z.number().min(0).max(2000),
});

const AiBulkEntrySchema = z.object({
    customer_id: z.string().min(1).optional(),
    customerName: z.string().min(1).optional(),
    morning_qty: z.number().int().min(0).max(20).default(0),
    evening_qty: z.number().int().min(0).max(20).default(0),
    morning_price: z.number().min(0).max(5000).default(0),
    evening_price: z.number().min(0).max(5000).default(0),
    morning_paid: z.boolean().default(false),
    evening_paid: z.boolean().default(false),
    extras: z.array(AiExtraItemSchema).default([]),
    is_manual_price: z.boolean().default(false),
    notes: z.string().max(500).optional(),
});

const AiBulkPayloadSchema = z.object({
    entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    entries: z.array(AiBulkEntrySchema).min(1),
});

const AiImportSchema = z.object({
    payload: z.array(AiBulkPayloadSchema).min(1),
    warnings: z.array(z.string()).default([]),
});

export type ParsedAiImportResponse = z.infer<typeof AiImportSchema>;

function buildPrompt(customers: Customer[]) {
    const customerNames = customers.map((customer) => customer.full_name).slice(0, 80).join(", ");

    return `You are a strict tiffin import processor. Convert raw text into the exact app bulk-save format.

Business rules:
- lunch = morning
- dinner = evening
- Cash rows should be normalized to "Cash"
- "1 + 5 roti" means base quantity 1 and extra roti quantity 5
- Additional roti or extra items go into extras as { "item": "roti", "qty": 5, "price": 0 }
- If customer line contains both Kuber F 606 and Swaminarayan, normalize to "Swaminarayan Kuber F 606"
- Keep the closest matched customer name from the known list when uncertain
- Ignore empty lines
- Return ONLY valid JSON with this exact structure:
{
  "payload": [
    {
      "entry_date": "YYYY-MM-DD",
      "entries": [
        {
          "customer_id": "customer-id-from-known-list",
          "morning_qty": 1,
          "evening_qty": 0,
          "morning_price": 30,
          "evening_price": 0,
          "morning_paid": false,
          "evening_paid": false,
          "extras": [{ "item": "roti", "qty": 5, "price": 0 }],
          "is_manual_price": false,
          "notes": "optional notes"
        }
      ]
    }
  ],
  "warnings": ["..."]
}

Known customers:
${customerNames}

Do not explain. Use valid JSON only.`;
}

function safeJsonParse<T>(value: string): T | null {
    try {
        return JSON.parse(value) as T;
    } catch {
        const match = value.match(/\{[\s\S]*\}/);
        if (!match) return null;
        try {
            return JSON.parse(match[0]) as T;
        } catch {
            return null;
        }
    }
}

function toBulkPayload(date: string, entries: ReturnType<typeof parseRawEntryText>["entries"], customers: Customer[]): BulkSavePayload[] {
    const normalizedEntries = entries.flatMap((entry) => {
        const match = customers.find((customer) =>
            normalizeCustomerName(customer.full_name) === normalizeCustomerName(entry.customerName) ||
            customer._id === entry.customerId,
        );

        if (!match) {
            return [];
        }

        return [{
            customer_id: match._id,
            morning_qty: Math.max(0, entry.morningQty),
            evening_qty: Math.max(0, entry.eveningQty),
            morning_price: match.tiffin_defaults?.morning_price ?? 0,
            evening_price: match.tiffin_defaults?.evening_price ?? 0,
            morning_paid: false,
            evening_paid: false,
            extras: (entry.extras ?? []).map((item) => ({
                item: item.item,
                qty: Math.max(0, item.qty),
                price: Math.max(0, item.price),
            })),
            is_manual_price: false,
            notes: entry.notes ?? undefined,
        }];
    });

    if (!normalizedEntries.length) {
        return [];
    }

    return [{ entry_date: date, entries: normalizedEntries }];
}

function normalizeAiPayload(rawPayload: BulkSavePayload[], customers: Customer[]): BulkSavePayload[] {
    return rawPayload
        .map((day) => ({
            entry_date: day.entry_date,
            entries: day.entries
                .map((entry) => {
                    const match = customers.find((customer) => customer._id === entry.customer_id)
                        ?? customers.find((customer) => normalizeCustomerName(customer.full_name) === normalizeCustomerName((entry as { customerName?: string }).customerName ?? ""));

                    const resolvedCustomerId = entry.customer_id ?? match?._id ?? "";
                    const defaultMorning = match?.tiffin_defaults?.morning_price ?? 30;
                    const defaultEvening = match?.tiffin_defaults?.evening_price ?? 30;

                    return {
                        customer_id: resolvedCustomerId,
                        morning_qty: Math.max(0, Number(entry.morning_qty ?? 0)),
                        evening_qty: Math.max(0, Number(entry.evening_qty ?? 0)),
                        morning_price: Number(entry.morning_price ?? defaultMorning),
                        evening_price: Number(entry.evening_price ?? defaultEvening),
                        morning_paid: Boolean(entry.morning_paid ?? false),
                        evening_paid: Boolean(entry.evening_paid ?? false),
                        extras: (entry.extras ?? []).map((item) => ({
                            item: String(item.item ?? "roti").trim() || "roti",
                            qty: Math.max(0, Number(item.qty ?? 0)),
                            price: Math.max(0, Number(item.price ?? 0)),
                        })),
                        is_manual_price: Boolean(entry.is_manual_price ?? false),
                        notes: entry.notes,
                    };
                })
                .filter((entry) => entry.customer_id),
        }))
        .filter((day) => day.entries.length > 0);
}

export async function parseImportTextWithAi(rawText: string, customers: Customer[], entryDate?: string) {
    const fallbackEntries = parseRawEntryText(rawText, customers);
    const fallbackPayload = entryDate ? toBulkPayload(entryDate, fallbackEntries.entries, customers) : [];
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        return {
            payload: fallbackPayload,
            warnings: [...fallbackEntries.warnings, "OpenAI API key not configured; using local parser fallback."],
            source: "local-fallback",
            entries: fallbackEntries.entries,
        };
    }

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
                temperature: 0,
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: buildPrompt(customers) },
                    { role: "user", content: rawText },
                ],
            }),
        });

        if (!response.ok) {
            const detail = await response.text();
            return {
                payload: fallbackPayload,
                warnings: [...fallbackEntries.warnings, `OpenAI request failed: ${detail.slice(0, 200)}`],
                source: "local-fallback",
                entries: fallbackEntries.entries,
            };
        }

        const json = await response.json() as {
            choices?: Array<{ message?: { content?: string } }>;
        };

        const content = json.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error("OpenAI response did not contain a message.");
        }

        const parsed = safeJsonParse<unknown>(content);
        if (!parsed || typeof parsed !== "object") {
            throw new Error("OpenAI response was not valid JSON.");
        }

        const validated = AiImportSchema.safeParse(parsed);
        if (!validated.success) {
            throw new Error(validated.error.issues.map((issue) => issue.message).join(", "));
        }

        const rawPayload = validated.data.payload as BulkSavePayload[];
        const payload = normalizeAiPayload(rawPayload, customers);
        const validatedPayload = bulkSaveSchema.array().safeParse(payload);

        if (!validatedPayload.success) {
            throw new Error(validatedPayload.error.issues.map((issue) => issue.message).join(", "));
        }

        return {
            payload: validatedPayload.data,
            warnings: [...validated.data.warnings, ...fallbackEntries.warnings],
            source: "openai",
            entries: fallbackEntries.entries,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "OpenAI parsing failed";
        return {
            payload: fallbackPayload,
            warnings: [...fallbackEntries.warnings, `LLM validation failed: ${message}`],
            source: "local-fallback",
            entries: fallbackEntries.entries,
        };
    }
}
