import { NextResponse } from 'next/server'
import generateInvoicePdf from '../../../../lib/invoice/generateInvoicePdf'
import { checkAuth } from '@/lib/checkAuth'

export async function POST(req: Request) {
    const { error } = await checkAuth()
    if (error) return error

    try {
        const body = await req.json()
        const { customerId, from, to } = body || {}
        if (!customerId || !from || !to) {
            return NextResponse.json({ error: 'customerId, from and to are required' }, { status: 400 })
        }

        const { buffer, filename } = await generateInvoicePdf(customerId, from, to)

        // Return Blob directly as PDF response
        return new Response(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        })
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
export async function GET(req: Request) {
    const { error } = await checkAuth()
    if (error) return error

    try {
        const { searchParams } = new URL(req.url)
        const customerId = searchParams.get('customerId')
        const from = searchParams.get('from')
        const to = searchParams.get('to')

        if (!customerId) {
            return NextResponse.json({ error: 'customerId is required' }, { status: 400 })
        }

        // Use provided dates or default to current month
        const now = new Date()
        const fromDate = from || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
        const toDate = to || now.toISOString().split('T')[0]

        console.log('[Invoice PDF] Generating for customerId:', customerId, 'from:', fromDate, 'to:', toDate)

        const { buffer, filename } = await generateInvoicePdf(customerId, fromDate, toDate)

        console.log('[Invoice PDF] Generated successfully:', filename)

        return new Response(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        })
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[Invoice API Error]', message, err)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}