import type { Document, Types } from "mongoose";

export interface ITiffinEntry extends Document {
  customer_id: Types.ObjectId;
  entry_date: Date;
  morning_qty: number;
  evening_qty: number;
  morning_price: number;
  evening_price: number;
  total_qty: number;
  total_amount: number;
  is_manual_price: boolean;
  morning_paid: boolean;
  evening_paid: boolean;
  extras?: TiffinExtraItem[];
  notes?: string;
  created_by?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TiffinExtraItem {
  item: string;
  qty: number;
  price: number;
}

export interface TiffinEntry {
  _id: string;
  customer_id: string;
  entry_date: string;
  morning_qty: number;
  evening_qty: number;
  morning_price: number;
  evening_price: number;
  total_qty: number;
  total_amount: number;
  is_manual_price: boolean;
  morning_paid: boolean;
  evening_paid: boolean;
  extras?: TiffinExtraItem[];
  notes?: string;
  created_by?: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    _id: string;
    full_name: string;
    phone: string;
    address?: string;
  };
}

/** Row returned by the preview/copy-from-date endpoint */
export interface TiffinPreviewRow {
  customer_id: string;
  name: string;
  address?: string;
  morning: boolean;
  morning_qty: number;
  morning_price: number;
  morning_paid: boolean;
  evening: boolean;
  evening_qty: number;
  evening_price: number;
  evening_paid: boolean;
  extras?: TiffinExtraItem[];
  has_existing_entry: boolean;
}

/** Payload for a single entry in bulk-save */
export interface BulkEntryInput {
  customer_id: string;
  morning_qty: number;
  morning_price: number;
  morning_paid?: boolean;
  evening_qty: number;
  evening_price: number;
  evening_paid?: boolean;
  extras?: TiffinExtraItem[];
  is_manual_price?: boolean;
  notes?: string;
}

/** Payload for the bulk-save endpoint */
export interface BulkSavePayload {
  entry_date: string; // YYYY-MM-DD
  entries: BulkEntryInput[];
}

// Legacy aliases kept for BulkCopyModal compatibility
/** @deprecated Use TiffinPreviewRow */
export type BulkPreviewRow = TiffinPreviewRow & {
  morning: boolean;
  evening: boolean;
  price: number;
};

/** @deprecated Use BulkSavePayload */
export interface BulkSavePayloadLegacy {
  date: string;
  entries: {
    customerId: string;
    morning: boolean;
    evening: boolean;
    price: number;
  }[];
}
