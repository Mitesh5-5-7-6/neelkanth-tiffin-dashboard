import React from 'react'
import { InvoiceData } from '@/types/invoice.type'
import InvoiceDocument from '../../../components/invoice/InvoiceDocument'
import { getMockInvoice } from '@/lib/mock/invoiceMock'

type Props = { searchParams?: { [key: string]: string | undefined } }

export default async function Page({ searchParams }: Props) {
    const customerId = searchParams?.customerId ?? 'c_01'
    const start_date = searchParams?.start_date
    const end_date = searchParams?.end_date
    const name = searchParams?.name

    const data: InvoiceData = getMockInvoice({
        id: `${customerId}-${start_date ?? ''}-${end_date ?? ''}`,
        customer: { id: customerId, name: name },
        startDate: start_date,
        endDate: end_date,
    })

    return (
        <html>
            <body className="bg-gray-50 p-6">
                <main className="mx-auto max-w-[190mm]">
                    <InvoiceDocument data={data} />
                </main>
            </body>
        </html>
    )
}
