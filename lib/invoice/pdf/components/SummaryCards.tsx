import React from 'react'
import { View, Text, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    card: { width: '23%', padding: 8, borderRadius: 6, backgroundColor: '#f7f7fb', textAlign: 'center' },
    num: { fontSize: 14, fontWeight: '700' },
    label: { fontSize: 9, color: '#666' }
})

export default function SummaryCards({ summary }: any) {
    return (
        <View style={styles.row}>
            <View style={styles.card}>
                <Text style={styles.label}>Total Days</Text>
                <Text style={styles.num}>{summary.totalDays}</Text>
            </View>
            <View style={styles.card}>
                <Text style={styles.label}>Total Tiffins</Text>
                <Text style={styles.num}>{summary.totalTiffins}</Text>
            </View>
            <View style={styles.card}>
                <Text style={styles.label}>Total Amount</Text>
                <Text style={styles.num}>₹{summary.subtotal}</Text>
            </View>
            <View style={styles.card}>
                <Text style={styles.label}>Paid Amount</Text>
                <Text style={styles.num}>₹{summary.paidAmount}</Text>
            </View>
        </View>
    )
}
