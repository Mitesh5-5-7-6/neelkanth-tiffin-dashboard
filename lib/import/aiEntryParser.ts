import type { Customer } from "@/types/customer.type";
import { normalizeCustomerName } from "@/lib/import/customerMatcher";

export interface ParsedAiExtraItem {
    item: string;
    qty: number;
    price: number;
}

export interface ParsedAiEntry {
    customerName: string;
    customerId?: string;
    morningQty: number;
    eveningQty: number;
    extras?: ParsedAiExtraItem[];
    notes?: string;
    sourceLine: string;
    matchedBy?: "exact" | "normalized" | "fallback";
}

export interface AiParseResult {
    entries: ParsedAiEntry[];
    warnings: string[];
}

const normalizeLine = (value: string) => value.replace(/\r/g, "").trim();

function isDateLikeOrAmountNoise(value: string): boolean {
    const trimmed = normalizeLine(value);
    if (!trimmed) return true;

    if (/^\d+(?:\.\d+)?\s*(?:=|:|-|\/)?\s*$/i.test(trimmed)) {
        return true;
    }

    if (/^\d{1,2}\/\d{1,2}(?:\/\d{2,4})?(?:\s*(?:lunch|dinner|morning|evening))?$/i.test(trimmed)) {
        return true;
    }

    const leadingDate = trimmed.match(/^\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/);
    if (leadingDate && trimmed.replace(leadingDate[0], "").replace(/^[\s=:-]+/, "").trim() === "") {
        return true;
    }

    const dateNoisePrefix = trimmed.replace(/^(?:[./-]*\d{1,2}\/\d{1,2}(?:\/\d{2,4})?[\s/.-]*)/i, "").trim();
    if (dateNoisePrefix === "" || dateNoisePrefix.toLowerCase() === "lunch" || dateNoisePrefix.toLowerCase() === "dinner") {
        return true;
    }

    const hasLetters = /[A-Za-z]/.test(trimmed);
    if (!hasLetters) return true;

    if (trimmed.includes("=") && !/[A-Za-z]/.test(trimmed.replace(/[^A-Za-z]/g, ""))) {
        return true;
    }

    return false;
}

function coerceNumber(value: unknown): number {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function resolveCustomerName(line: string, customers: Customer[]): {
    customerName: string;
    customerId?: string;
    matchedBy?: "exact" | "normalized" | "fallback";
} {
    const trimmed = normalizeLine(line);
    if (!trimmed || isDateLikeOrAmountNoise(trimmed)) {
        return { customerName: "", matchedBy: "fallback" };
    }

    const lineWithoutNoise = trimmed.replace(/\s*=\s*\d+(?:\.\d+)?\s*$/i, "").trim();
    const hasHardAmountFormat = /(?:^|\s)[A-Za-z][A-Za-z0-9 .-]*\s*=\s*\d+(?:\.\d+)?\s*$/i.test(trimmed)
        && trimmed.replace(/[^A-Za-z]/g, "").length > 0
        && !/\b(?:lunch|dinner|morning|evening|roti|extra|xtra)\b/i.test(trimmed);

    if (hasHardAmountFormat && !lineWithoutNoise) {
        return { customerName: "", matchedBy: "fallback" };
    }

    const amountOnlyPseudoCustomer = /^[A-Za-z][A-Za-z0-9 .-]*\s*=\s*$/i.test(trimmed) && !/\b(?:cash)\b/i.test(trimmed);
    if (amountOnlyPseudoCustomer) {
        return { customerName: "", matchedBy: "fallback" };
    }

    const explicitCash = /(^|\s|=)cash\b/i.test(trimmed);
    if (explicitCash) {
        return { customerName: "Cash", matchedBy: "fallback" };
    }

    const normalized = trimmed
        .replace(/^[^a-zA-Z0-9]+/, "")
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (/swaminarayan/i.test(normalized) && /kuber/i.test(normalized) && /606/i.test(normalized)) {
        const customer = customers.find((entry) =>
            normalizeCustomerName(entry.full_name) === normalizeCustomerName("Swaminarayan Kuber F 606"),
        );
        return {
            customerName: customer?.full_name ?? "Swaminarayan Kuber F 606",
            customerId: customer?._id,
            matchedBy: customer ? "normalized" : "fallback",
        };
    }

    if (/kuber/i.test(normalized) && /606/i.test(normalized)) {
        const customer = customers.find((entry) =>
            normalizeCustomerName(entry.full_name) === normalizeCustomerName("Kuber F 606"),
        );
        return {
            customerName: customer?.full_name ?? "Kuber F 606",
            customerId: customer?._id,
            matchedBy: customer ? "normalized" : "fallback",
        };
    }

    const direct = customers.find(
        (entry) =>
            normalizeCustomerName(entry.full_name) === normalizeCustomerName(normalized) ||
            normalizeCustomerName(entry.full_name).includes(normalizeCustomerName(normalized)) ||
            normalizeCustomerName(normalized).includes(normalizeCustomerName(entry.full_name)),
    );

    if (direct) {
        return {
            customerName: direct.full_name,
            customerId: direct._id,
            matchedBy: "normalized",
        };
    }

    const fallback = normalized
        .replace(/\b(?:lunch|dinner|morning|evening|roti|extra|xtra|cash)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();

    if (fallback) {
        const fallbackCustomer = customers.find(
            (entry) => normalizeCustomerName(entry.full_name) === normalizeCustomerName(fallback),
        );
        if (fallbackCustomer) {
            return {
                customerName: fallbackCustomer.full_name,
                customerId: fallbackCustomer._id,
                matchedBy: "normalized",
            };
        }
    }

    return { customerName: normalized || "Unknown customer", matchedBy: "fallback" };
}

function parseMeal(line: string): { morningQty: number; eveningQty: number; extras: ParsedAiExtraItem[]; notes?: string } {
    const normalized = line.toLowerCase();
    let morningQty = 0;
    let eveningQty = 0;
    const extras: ParsedAiExtraItem[] = [];

    const plusMatch = line.match(/(\d+)\s*\+\s*(\d+)\s*(?:roti|roti(s)?|extra|xtra)?/i);
    if (plusMatch) {
        const baseQty = coerceNumber(plusMatch[1]);
        const extraQty = coerceNumber(plusMatch[2]);
        const mealLabel = normalized.includes("dinner") || normalized.includes("evening") ? "evening" : "morning";
        if (mealLabel === "evening") {
            eveningQty = baseQty;
        } else {
            morningQty = baseQty;
        }
        if (extraQty > 0) {
            extras.push({ item: "roti", qty: extraQty, price: 0 });
        }
    }

    const lunchMatch = line.match(/(?:lunch|morning)\s*(\d+)/i);
    const dinnerMatch = line.match(/(?:dinner|evening)\s*(\d+)/i);
    const quantityMatch = line.match(/(\d+)\s*(?:roti|xtra|extra)?/i);

    if (!plusMatch && lunchMatch) {
        morningQty = coerceNumber(lunchMatch[1]);
    }

    if (!plusMatch && dinnerMatch) {
        eveningQty = coerceNumber(dinnerMatch[1]);
    }

    if (!plusMatch && !lunchMatch && !dinnerMatch && quantityMatch) {
        morningQty = coerceNumber(quantityMatch[1]);
    }

    const rotiOnlyMatch = line.match(/(\d+)\s*(?:roti|xtra|extra)/i);
    if (!plusMatch && rotiOnlyMatch) {
        const rotiQty = coerceNumber(rotiOnlyMatch[1]);
        if (rotiQty > 0) {
            extras.push({ item: "roti", qty: rotiQty, price: 0 });
            if (morningQty === 0 && eveningQty === 0) {
                morningQty = 1;
            }
        }
    }

    if (!plusMatch && !lunchMatch && !dinnerMatch && normalized.includes("dinner")) {
        eveningQty = Math.max(1, eveningQty);
    }

    return { morningQty, eveningQty, extras, notes: line };
}

export function parseRawEntryText(rawText: string, customers: Customer[]): AiParseResult {
    const lines = normalizeLine(rawText)
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);

    const entries: ParsedAiEntry[] = [];
    const warnings: string[] = [];

    for (const line of lines) {
        const cleaned = line
            .replace(/^[-•*\d\s]+/, "")
            .replace(/\s*[-–—]\s*/g, " ")
            .trim();

        if (!cleaned || isDateLikeOrAmountNoise(cleaned)) {
            warnings.push(`Ignored line without a valid customer or quantity: ${cleaned || line}`);
            continue;
        }

        const customerLookup = resolveCustomerName(cleaned, customers);
        const isExplicitCashRow = /(^|\s|=)cash\b/i.test(cleaned);
        const looksLikeAmountOnlyCustomer = customerLookup.customerName && !customerLookup.customerId && /\d/.test(cleaned) && /(?:^|\s)=\s*\d+/.test(cleaned)
            && !isExplicitCashRow
            && !/\b(?:lunch|dinner|morning|evening|roti|extra|xtra)\b/i.test(cleaned);

        if (looksLikeAmountOnlyCustomer) {
            warnings.push(`Ignored line without a valid customer match: ${cleaned}`);
            continue;
        }

        const amountOnlyPseudoCustomer = /^[A-Za-z][A-Za-z0-9 .-]*\s*=\s*$/i.test(cleaned) && !isExplicitCashRow;
        if (amountOnlyPseudoCustomer) {
            warnings.push(`Ignored line without a valid customer match: ${cleaned}`);
            continue;
        }

        const meal = parseMeal(cleaned);
        if (meal.morningQty === 0 && meal.eveningQty === 0 && !meal.extras.length) {
            warnings.push(`Ignored line without a valid quantity: ${cleaned}`);
            continue;
        }

        const resolvedCustomer = resolveCustomerName(cleaned, customers);
        if (!resolvedCustomer.customerName || resolvedCustomer.customerName === "Unknown customer") {
            warnings.push(`Could not confidently resolve customer for: ${cleaned}`);
            continue;
        }

        entries.push({
            customerName: resolvedCustomer.customerName,
            customerId: resolvedCustomer.customerId,
            morningQty: meal.morningQty,
            eveningQty: meal.eveningQty,
            extras: meal.extras.length ? meal.extras : undefined,
            notes: cleaned,
            sourceLine: cleaned,
            matchedBy: resolvedCustomer.matchedBy,
        });
    }

    return { entries, warnings };
}
