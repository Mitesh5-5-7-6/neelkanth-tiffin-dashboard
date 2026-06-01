import React from 'react';
import { Invoice } from '@/types/invoice.type';

export default function AmountSummary({ invoice }: { invoice: Invoice }) {
    return (
        <div className="p-4 rounded-xl bg-white shadow-sm w-full max-w-sm">
            <div className="text-sm text-gray-600">
                <div className="flex justify-between mb-2">
                    <span>Total Tiffins</span>
                    <span>{invoice.totalTiffins}</span>
                </div>
                <div className="flex justify-between mb-2">
                    <span>Rate per Tiffin</span>
                    <span>₹{invoice.rate}</span>
                </div>
                <div className="border-t border-gray-100 mt-3 pt-3">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>₹{invoice.subtotal}</span>
                    </div>
                    <div className="flex justify-between mt-2">
                        <span>Discount</span>
                        <span>₹{invoice.discount}</span>
                    </div>
                    <div className="flex justify-between mt-2">
                        <span>Other Charges</span>
                        <span>₹{invoice.otherCharges}</span>
                    </div>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-purple-50 text-right">
                    <div className="text-xs text-gray-600">TOTAL AMOUNT</div>
                    <div className="text-2xl font-bold text-purple-700">₹{invoice.totalAmount}</div>
                </div>
            </div>
        </div>
    );
}
