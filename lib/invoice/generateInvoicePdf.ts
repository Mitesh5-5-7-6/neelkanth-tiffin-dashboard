import { pdf } from '@react-pdf/renderer'
import React from 'react'
import InvoiceDocument from './pdf/InvoiceDocument'
import QRCode from 'qrcode'

type FetchOpts = { baseUrl?: string }

interface TiffinRecord {
    date: string
    morningQty?: number
    morningRate?: number
    eveningQty?: number
    eveningRate?: number
}

interface Payment {
    amount?: number
    upi?: string
    [key: string]: unknown
}

async function fetchJson(path: string, opts: FetchOpts = {}) {
    const base = opts.baseUrl || process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:3000'
    const res = await fetch(`${base}${path}`)
    if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`)
    return res.json()
}

export async function generateInvoicePdf(customerId: string, fromDate: string, toDate: string) {
    if (!customerId) throw new Error('customerId is required')

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:3000'

    // Fetch customer
    const customer = await fetchJson(`/api/customers/${customerId}`, { baseUrl })
    if (!customer) throw new Error('Customer not found')

    // Fetch tiffin entries for the date range - filter by customer_id and date range
    // Using the new endpoint that supports customer_id and date range filtering
    let records: TiffinRecord[] = []
    try {
        const tiffinRes = await fetchJson(`/api/tiffin-entries/by-customer?customer_id=${customerId}&from=${fromDate}&to=${toDate}`, { baseUrl })
        records = tiffinRes.data || tiffinRes || []
    } catch (e) {
        console.warn('Tiffin fetch failed, using empty records:', e)
        records = []
    }

    // Fetch payments for this customer
    let payments: Payment[] = []
    try {
        const paymentsRes = await fetchJson(`/api/payments?customer_id=${customerId}&limit=100`, { baseUrl })
        payments = paymentsRes.data || paymentsRes || []
    } catch (e) {
        console.warn('Payments fetch failed, using empty payments:', e)
        payments = []
    }

    // Calculate totals
    const totalDays = records ? new Set(records.map((r: TiffinRecord) => r.date)).size : 0
    let totalTiffins = 0
    let morningTotal = 0
    let eveningTotal = 0

    for (const r of (records || [])) {
        const mq = r.morningQty || 0
        const mr = r.morningRate || 0
        const eq = r.eveningQty || 0
        const er = r.eveningRate || 0
        totalTiffins += mq + eq
        morningTotal += mq * mr
        eveningTotal += eq * er
    }

    const subtotal = morningTotal + eveningTotal
    const discount = 0
    const extraCharges = 0
    const tax = 0
    const grandTotal = subtotal - discount + extraCharges + tax

    const paidAmount = (payments || []).reduce((s: number, p: Payment) => s + (p.amount || 0), 0)
    const remaining = Math.max(0, grandTotal - paidAmount)

    const invoiceNumber = `TT-INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${customer.customerCode || customer._id}`
    const invoiceDate = new Date().toISOString().slice(0, 10)
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const totals = {
        totalDays,
        totalTiffins,
        morningTotal,
        eveningTotal,
        subtotal,
        discount,
        extraCharges,
        tax,
        grandTotal,
        paidAmount,
        remaining,
        invoiceNumber,
        invoiceDate,
        dueDate,
        period: `${fromDate} - ${toDate}`,
        generatedOn: new Date().toISOString()
    }

    // Generate QR from UPI id (company UPI or payment UPI if present)
    const upiId = process.env.NEXT_PUBLIC_UPI_ID || (payments && payments[0] && payments[0].upi) || 'neelkanth@upi'
    const qrDataUrl = await QRCode.toDataURL(`upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent('Neelkanth Tiffin Service')}&am=${grandTotal}`)

    const company = {
        name: process.env.NEXT_PUBLIC_COMPANY_NAME || 'Neelkanth Tiffin Service',
        address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || '201, Shreeji Complex, Ahmedabad, Gujarat',
        contact: process.env.NEXT_PUBLIC_COMPANY_CONTACT || '98765 43210',
        email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || 'info@tiffintrack.com',
        logo: process.env.NEXT_PUBLIC_COMPANY_LOGO || undefined
    }

    // Render PDF
    const doc = React.createElement(InvoiceDocument, { company, customer, records, payments, totals, qr: qrDataUrl })
    const pdfDoc = pdf()
    pdfDoc.updateContainer(doc)
    const blob = await pdfDoc.toBlob()

    return { buffer: blob, filename: `${invoiceNumber}.pdf`, totals }
}

export default generateInvoicePdf
