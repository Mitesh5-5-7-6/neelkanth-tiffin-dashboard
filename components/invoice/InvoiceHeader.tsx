import React from 'react';
import { Invoice } from '@/types/invoice.type';

type Props = {
    companyName?: string;
    tagline?: string;
    invoice: Invoice;
};

export default function InvoiceHeader({ companyName = 'TiffinTrack', tagline = 'Healthy Tiffin, Happy Life.', invoice }: Props) {
    return (
        <header className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-purple-600 to-indigo-500 text-white flex items-center justify-center shadow-md">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 2v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M8 2v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M5 14h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <div>
                    <h1 className="text-xl font-semibold">{companyName}</h1>
                    <p className="text-sm text-muted">{tagline}</p>
                </div>
            </div>

            <div className="text-right">
                <div className="flex items-center justify-end gap-3">
                    <div className="text-sm font-semibold text-gray-600">INVOICE / BILL</div>
                    <div className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm">{invoice.status}</div>
                </div>

                <div className="mt-3 text-sm text-gray-600">
                    <div>
                        <span className="font-medium">Invoice No.</span>
                        <span className="ml-2">: {invoice.invoiceNo}</span>
                    </div>
                    <div>
                        <span className="font-medium">Invoice Date</span>
                        <span className="ml-2">: {invoice.invoiceDate}</span>
                    </div>
                    <div>
                        <span className="font-medium">Billing Period</span>
                        <span className="ml-2">: {invoice.billingPeriod}</span>
                    </div>
                </div>
            </div>
        </header>
    );
}
