import React from 'react';
import { InvoiceItem } from '@/types/invoice.type';

export default function InvoiceTable({ items }: { items: InvoiceItem[] }) {
    return (
        <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full invoice-table border-collapse table-fixed">
                <thead className="bg-white">
                    <tr className="text-left text-sm text-muted">
                        <th className="px-4 py-3 w-36">DATE</th>
                        <th className="px-4 py-3 w-24">DAY</th>
                        <th className="px-4 py-3 w-20">MORNING</th>
                        <th className="px-4 py-3 w-20">EVENING</th>
                        <th className="px-4 py-3 w-24">TOTAL TIFFINS</th>
                        <th className="px-4 py-3 w-28">RATE / TIFFIN</th>
                        <th className="px-4 py-3 w-28">AMOUNT</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((it, idx) => (
                        <tr key={it.date} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} text-sm`}>
                            <td className="px-4 py-3">{it.date}</td>
                            <td className="px-4 py-3">{it.day}</td>
                            <td className="px-4 py-3 text-center">{it.morning}</td>
                            <td className="px-4 py-3 text-center">{it.evening}</td>
                            <td className="px-4 py-3 text-center">{it.totalTiffins}</td>
                            <td className="px-4 py-3 text-center">₹{it.rate}</td>
                            <td className="px-4 py-3 text-right">₹{it.amount}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
