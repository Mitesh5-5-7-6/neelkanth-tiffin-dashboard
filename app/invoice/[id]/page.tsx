import React from 'react';
import Link from 'next/link';
import { getMockInvoice } from '@/lib/mock/invoiceMock';
import InvoiceDocument from '../../../components/invoice/InvoiceDocument';

export default async function Page({ params }: { params: { id: string } }) {
    const id = params.id;
    const data = getMockInvoice(id);

    return (
        <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Invoice {data.invoice.invoiceNo}</h2>
                <div>
                    <a href={`/api/invoice/${id}`} className="inline-block px-4 py-2 bg-purple-600 text-white rounded">Download PDF</a>
                </div>
            </div>

            <div className="bg-white p-4 rounded shadow">
                {/* Quick preview (server-rendered) */}
                <InvoiceDocument data={data} />
            </div>
        </div>
    );
}
