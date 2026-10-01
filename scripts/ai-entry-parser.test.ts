import assert from "node:assert/strict";
import { parseRawEntryText } from "../lib/import/aiEntryParser";

const text = `
Kuber F 606 - 1+5 roti
Cash = dream rise, cash i, cash galaxy, 1+2 roti
Raj 1 lunch
Rina dinner 2
Swaminarayan Kuber F 606 2 roti
`;

const result = parseRawEntryText(text, [
    { _id: "cash", full_name: "Cash", is_active: true, tiffin_defaults: { morning: true, morning_qty: 1, morning_price: 30, evening: true, evening_qty: 1, evening_price: 30 }, createdAt: "", updatedAt: "" },
    { _id: "kuber", full_name: "Kuber F 606", is_active: true, tiffin_defaults: { morning: true, morning_qty: 1, morning_price: 30, evening: true, evening_qty: 1, evening_price: 30 }, createdAt: "", updatedAt: "" },
    { _id: "swami", full_name: "Swaminarayan Kuber F 606", is_active: true, tiffin_defaults: { morning: true, morning_qty: 1, morning_price: 30, evening: true, evening_qty: 1, evening_price: 30 }, createdAt: "", updatedAt: "" },
    { _id: "raj", full_name: "Raj", is_active: true, tiffin_defaults: { morning: true, morning_qty: 1, morning_price: 30, evening: true, evening_qty: 1, evening_price: 30 }, createdAt: "", updatedAt: "" },
    { _id: "rina", full_name: "Rina", is_active: true, tiffin_defaults: { morning: true, morning_qty: 1, morning_price: 30, evening: true, evening_qty: 1, evening_price: 30 }, createdAt: "", updatedAt: "" },
]);

assert.ok(result.entries.length >= 4, "Should parse multiple entries");
assert.ok(result.entries.some((entry) => entry.customerName === "Cash"), "Cash rows should be aggregated as Cash");
assert.ok(result.entries.some((entry) => entry.customerName === "Kuber F 606"), "Kuber F 606 should be mapped");
assert.ok(result.entries.some((entry) => entry.customerName === "Swaminarayan Kuber F 606"), "Swaminarayan variant should be mapped");
assert.ok(result.entries.some((entry) => entry.morningQty > 0), "A morning lunch entry should produce morning quantity");
assert.ok(result.entries.some((entry) => entry.eveningQty > 0), "An evening dinner entry should produce evening quantity");
assert.ok(result.entries.some((entry) => (entry.extras ?? []).length > 0), "Extra roti entries should be stored in extras");

const messyText = `
9/2026 lunch
Darji = 3
Dreem rice =6
Kalhar =1
1509 =
Kuber E 501 =
Kuber A.702 =
Shilaj A 901 mansi=
Cash= dreem rise =318.   Cash =
`;

const messyResult = parseRawEntryText(messyText, [
    { _id: "cash", full_name: "Cash", is_active: true, tiffin_defaults: { morning: true, morning_qty: 1, morning_price: 30, evening: true, evening_qty: 1, evening_price: 30 }, createdAt: "", updatedAt: "" },
    { _id: "darji", full_name: "Darji", is_active: true, tiffin_defaults: { morning: true, morning_qty: 1, morning_price: 30, evening: true, evening_qty: 1, evening_price: 30 }, createdAt: "", updatedAt: "" },
    { _id: "dream", full_name: "Dreem rice", is_active: true, tiffin_defaults: { morning: true, morning_qty: 1, morning_price: 30, evening: true, evening_qty: 1, evening_price: 30 }, createdAt: "", updatedAt: "" },
    { _id: "kalhar", full_name: "Kalhar", is_active: true, tiffin_defaults: { morning: true, morning_qty: 1, morning_price: 30, evening: true, evening_qty: 1, evening_price: 30 }, createdAt: "", updatedAt: "" },
]);

assert.ok(messyResult.entries.some((entry) => entry.customerName === "Cash" && entry.morningQty === 318), "Cash totals should be preserved without noisy date/amount lines");
assert.ok(!messyResult.entries.some((entry) => /\b9\/2026\b|^1509$|^Kuber E 501$|^Kuber A\.702$|^Shilaj A 901 mansi$/.test((entry.customerName ?? ""))), "Date and amount-like noise should be ignored");
console.log("AI entry parser test passed");
