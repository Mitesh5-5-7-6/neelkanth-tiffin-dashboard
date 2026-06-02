import { NextRequest } from 'next/server';
import generatePdf from '@/lib/pdf/generatePdf'

export async function GET(req: NextRequest) {
    try {
        const urlObj = new URL(req.url)
        const sp = urlObj.searchParams
        const customerId = sp.get('customerId') ?? 'c_01'
        const start_date = sp.get('start_date')
        const end_date = sp.get('end_date')
        const name = sp.get('name')

        const baseUrl = process.env.BASE_URL || 'http://localhost:3000'
        const params = new URLSearchParams()
        params.set('customerId', customerId)
        if (start_date) params.set('start_date', start_date)
        if (end_date) params.set('end_date', end_date)
        if (name) params.set('name', name)

        const pageUrl = `${baseUrl}/invoice/print?${params.toString()}`

        const pdfBuffer = await generatePdf(pageUrl)

        return new Response(Buffer.from(pdfBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="invoice-${customerId}.pdf"`,
            },
        })
    } catch (err) {
        console.error('invoice generate error', err)
        return new Response(JSON.stringify({ error: 'Failed to generate invoice PDF' }), { status: 500 })
    }
}
