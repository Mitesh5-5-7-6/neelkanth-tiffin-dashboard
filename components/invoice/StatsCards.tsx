import React from 'react';
import { Invoice } from '@/types/invoice.type';

export default function StatsCards({ invoice }: { invoice: Invoice }) {
    return (
        <div className="grid grid-cols-4 gap-4 w-full">
            <div className="p-4 rounded-xl bg-linear-to-br from-purple-50 to-white shadow-sm text-center">
                <div className="text-sm text-muted">Total Days</div>
                <div className="text-2xl font-bold">{invoice.totalDays}</div>
                <div className="text-xs text-muted">Days</div>
            </div>
            <div className="p-4 rounded-xl bg-linear-to-br from-green-50 to-white shadow-sm text-center">
                <div className="text-sm text-muted">Total Tiffins</div>
                <div className="text-2xl font-bold">{invoice.totalTiffins}</div>
                <div className="text-xs text-muted">Tiffins</div>
            </div>
            <div className="p-4 rounded-xl bg-linear-to-br from-yellow-50 to-white shadow-sm text-center">
                <div className="text-sm text-muted">Total Amount</div>
                <div className="text-2xl font-bold">₹{invoice.totalAmount}</div>
            </div>
            <div className="p-4 rounded-xl bg-linear-to-br from-blue-50 to-white shadow-sm text-center">
                <div className="text-sm text-muted">Paid Amount</div>
                <div className="text-2xl font-bold text-blue-600">₹{invoice.paidAmount}</div>
                <div className="text-xs text-green-600">Fully Paid</div>
            </div>
        </div>
    );
}
