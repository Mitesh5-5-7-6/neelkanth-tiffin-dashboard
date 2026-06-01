import React from 'react';
import { Customer } from '@/types/invoice.type';

export default function CustomerCard({ customer }: { customer: Customer }) {
    return (
        <div className="p-4 rounded-xl bg-white shadow-sm w-full max-w-xs">
            <h3 className="text-sm font-semibold text-gray-700">BILL TO</h3>
            <div className="mt-3">
                <div className="font-medium text-gray-900">{customer.name}</div>
                <div className="text-sm text-muted mt-1">{customer.phone}</div>
                <div className="text-sm text-muted mt-1">{customer.address}</div>
            </div>
        </div>
    );
}
