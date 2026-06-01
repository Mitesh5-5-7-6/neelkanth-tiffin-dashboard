import React from 'react';
import InvoiceDocument from '../../../../components/invoice/InvoiceDocument';
import { getMockInvoice } from '@/lib/mock/invoiceMock';

export default async function Page({ params }: { params: { id: string } }) {
    const id = params.id;
    const data = getMockInvoice(id);

    return (
        <html>
            <body className="bg-gray-50 p-6">
                <main className="mx-auto max-w-[190mm]">
                    {/* InvoiceDocument is async and server-rendered for perfect print output */}
                    <InvoiceDocument data={data} />
                </main>
            </body>
        </html>
    );
}
