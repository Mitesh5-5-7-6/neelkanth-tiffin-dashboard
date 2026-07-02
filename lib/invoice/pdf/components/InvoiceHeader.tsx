import React from 'react'
import { View, Text, Image, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
    container: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    left: { flexDirection: 'column' },
    logo: { width: 72, height: 72, marginBottom: 4 },
    companyName: { fontSize: 14, fontWeight: '700' },
    small: { fontSize: 8, color: '#666' },
    right: { textAlign: 'right' },
    badge: { padding: 6, borderRadius: 6, color: 'white', fontSize: 10, fontWeight: '700' },
    badgePaid: { backgroundColor: '#16a34a' },
    badgeUnpaid: { backgroundColor: '#f97316' },
    badgeOverdue: { backgroundColor: '#ef4444' },
    metaRow: { fontSize: 10, marginTop: 4 }
})

export default function InvoiceHeader({ company, invoiceMeta }: any) {
    const status = (invoiceMeta?.status || 'UNPAID').toUpperCase()
    const badgeStyle = status === 'PAID' ? styles.badgePaid : status === 'OVERDUE' ? styles.badgeOverdue : styles.badgeUnpaid

    return (
        <View style={styles.container}>
            <View style={styles.left}>
                {company?.logo && <Image style={styles.logo} src={company.logo} />}
                <Text style={styles.companyName}>{company?.name || 'Neelkanth Tiffin Service'}</Text>
                <Text style={styles.small}>{company?.address}</Text>
                <Text style={styles.small}>{company?.contact} • {company?.email}</Text>
            </View>

            <View style={styles.right}>
                <Text style={[styles.badge, badgeStyle]}>{status}</Text>
                <Text style={styles.metaRow}>Invoice No: {invoiceMeta?.number}</Text>
                <Text style={styles.metaRow}>Invoice Date: {invoiceMeta?.date}</Text>
                {invoiceMeta?.dueDate && <Text style={styles.metaRow}>Due Date: {invoiceMeta?.dueDate}</Text>}
                {invoiceMeta?.period && <Text style={styles.metaRow}>Billing Period: {invoiceMeta.period}</Text>}
            </View>
        </View>
    )
}
