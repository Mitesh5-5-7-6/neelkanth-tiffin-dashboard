import React from 'react'
import { View, Text, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
    container: { width: '40%', marginLeft: '60%', borderWidth: 1, borderColor: '#eee', padding: 8, borderRadius: 6 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    label: { fontSize: 9, color: '#555' },
    value: { fontSize: 10, fontWeight: '700' }
})

export default function BillingSummary({ totals }: any) {
    return (
        <View style={styles.container}>
            <View style={styles.row}><Text style={styles.label}>Morning Total</Text><Text style={styles.value}>₹{totals.morningTotal}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Evening Total</Text><Text style={styles.value}>₹{totals.eveningTotal}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Subtotal</Text><Text style={styles.value}>₹{totals.subtotal}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Discount</Text><Text style={styles.value}>₹{totals.discount || 0}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Extra Charges</Text><Text style={styles.value}>₹{totals.extraCharges || 0}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Tax</Text><Text style={styles.value}>₹{totals.tax || 0}</Text></View>
            <View style={[styles.row, { marginTop: 6 }]}><Text style={styles.label}>Grand Total</Text><Text style={styles.value}>₹{totals.grandTotal}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Paid</Text><Text style={styles.value}>₹{totals.paidAmount}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Remaining</Text><Text style={styles.value}>₹{totals.remaining}</Text></View>
        </View>
    )
}
