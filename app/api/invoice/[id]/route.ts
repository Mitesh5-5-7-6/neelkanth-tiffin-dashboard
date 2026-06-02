import { NextRequest, NextResponse } from 'next/server';
import generatePdf from '@/lib/pdf/generatePdf';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
    const { id } = await params;
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const url = `${baseUrl}/invoice/${id}/print`;

    try {
        const pdfBuffer = await generatePdf(url);
        return new Response(Buffer.from(pdfBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="invoice-${id}.pdf"`,
            },
        });
    } catch (err) {
        console.error('API /api/invoice/[id] error', err);
        return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
    }
}
