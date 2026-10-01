import { type NextRequest } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Customer from "@/models/customer.model";
import { checkAuth } from "@/lib/checkAuth";
import { success, badRequest, internalServerError } from "@/lib/apiResponse";
import { parseImportTextWithAi } from "@/lib/import/aiImportService";

export async function POST(request: NextRequest) {
    const { error } = await checkAuth();
    if (error) return error;

    try {
        const body = await request.json();
        const text = typeof body?.text === "string" ? body.text : "";
        const entryDate = typeof body?.entryDate === "string" ? body.entryDate : undefined;
        const useLLM = body?.useLLM !== false;

        if (!text.trim()) {
            return badRequest("Text content is required.");
        }

        await dbConnect();
        const customers = await Customer.find({ is_active: true }).lean();
        const parsed = useLLM
            ? await parseImportTextWithAi(text, customers as any[], entryDate)
            : { payload: [], warnings: ["LLM parsing disabled"], source: "local-fallback", entries: [] };

        return success({
            payload: parsed.payload,
            entries: parsed.entries.map((entry) => ({
                customerName: entry.customerName,
                customerId: entry.customerId,
                morningQty: entry.morningQty,
                eveningQty: entry.eveningQty,
                extras: entry.extras,
                sourceLine: entry.sourceLine,
            })),
            warnings: parsed.warnings,
            source: parsed.source,
            entryDate,
        }, "AI import parsing completed successfully");
    } catch (error) {
        return internalServerError(error);
    }
}
