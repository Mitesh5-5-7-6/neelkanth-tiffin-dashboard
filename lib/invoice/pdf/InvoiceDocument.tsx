import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import InvoiceHeader from './components/InvoiceHeader'
import CustomerCard from './components/CustomerCard'
import SummaryCards from './components/SummaryCards'
import ConsumptionTable from './components/ConsumptionTable'
import BillingSummary from './components/BillingSummary'
import PaymentDetails from './components/PaymentDetails'
import InvoiceFooter from './components/InvoiceFooter'

const styles = StyleSheet.create({
    page: { padding: 24, fontSize: 11, fontFamily: 'Helvetica' },
    section: { marginBottom: 8 }
})

export default function InvoiceDocument({ company, customer, records, payments, totals, qr }: any) {
    const invoiceMeta = {
        status: totals?.paidAmount >= totals?.grandTotal ? 'PAID' : 'UNPAID',
        number: totals?.invoiceNumber,
        date: totals?.invoiceDate,
        dueDate: totals?.dueDate,
        period: totals?.period
    }

    return (
        <Document>
            <Page size="A4" style={styles.page} wrap>
                <InvoiceHeader company={company} invoiceMeta={invoiceMeta} />

                <View style={styles.section}>
                    <CustomerCard customer={customer} />
                </View>

                <View style={styles.section}>
                    <SummaryCards summary={totals} />
                </View>

                <View style={styles.section}>
                    <ConsumptionTable records={records} />
                </View>

                <View style={styles.section}>
                    <BillingSummary totals={totals} />
                </View>

                <View style={styles.section}>
                    <PaymentDetails payment={payments?.[0] || {}} qrDataUrl={qr} />
                </View>

                <InvoiceFooter meta={{ generatedOn: totals?.generatedOn, supportContact: company?.contact, companyName: company?.name }} />
            </Page>
        </Document>
    )
}
