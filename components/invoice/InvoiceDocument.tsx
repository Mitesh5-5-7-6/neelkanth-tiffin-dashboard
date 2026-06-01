import React from 'react';
import InvoiceHeader from './InvoiceHeader';
import CustomerCard from './CustomerCard';
import StatsCards from './StatsCards';
import InvoiceTable from './InvoiceTable';
import PaymentDetails from './PaymentDetails';
import AmountSummary from './AmountSummary';
import FooterSection from './FooterSection';
import { InvoiceData } from '@/types/invoice.type';

export default async function InvoiceDocument({ data }: { data: InvoiceData }) {
    return (
        <article className="invoice-root print-preserve-bg max-w-[210mm] mx-auto bg-transparent">
            <div className="p-6 bg-white rounded-2xl shadow-md">
                <InvoiceHeader invoice={data.invoice} />

                <div className="flex gap-6 mb-6 items-start">
                    <CustomerCard customer={data.customer} />

                    <div className="flex-1">
                        <StatsCards invoice={data.invoice} />
                    </div>
                </div>

                <InvoiceTable items={data.items} />

                <div className="mt-6 grid grid-cols-2 gap-6">
                    <div>
                        <PaymentDetails payment={data.payment} />
                    </div>
                    <div className="flex justify-end">
                        <AmountSummary invoice={data.invoice} />
                    </div>
                </div>

                <FooterSection />
            </div>
        </article>
    );
}
