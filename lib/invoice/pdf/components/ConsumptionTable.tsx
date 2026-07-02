import React from 'react'
import { View, Text, StyleSheet } from '@react-pdf/renderer'
import { format, parseISO } from 'date-fns'

const styles = StyleSheet.create({
    table: { width: '100%', borderWidth: 1, borderColor: '#e6e6f0', marginBottom: 8 },
    headerRow: { flexDirection: 'row', backgroundColor: '#f3f4ff', borderBottomWidth: 1, borderColor: '#e6e6f0' },
    row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f0f0f6', paddingVertical: 6 },
    cell: { fontSize: 8, padding: 4 }
})

export default function ConsumptionTable({ records }: any) {
    if (!records || records.length === 0) {
        return <Text>No Tiffin Records Found</Text>
    }

    return (
        <View style={styles.table}>
            <View style={styles.headerRow}>
                <Text style={[styles.cell, { width: '12%' }]}>Date</Text>
                <Text style={[styles.cell, { width: '8%' }]}>Day</Text>
                <Text style={[styles.cell, { width: '9%' }]}>Morn Qty</Text>
                <Text style={[styles.cell, { width: '9%' }]}>Morn Rate</Text>
                <Text style={[styles.cell, { width: '9%' }]}>Morn Amt</Text>
                <Text style={[styles.cell, { width: '9%' }]}>Eve Qty</Text>
                <Text style={[styles.cell, { width: '9%' }]}>Eve Rate</Text>
                <Text style={[styles.cell, { width: '9%' }]}>Eve Amt</Text>
                <Text style={[styles.cell, { width: '16%' }]}>Daily Total</Text>
            </View>

            {records.map((r: any, idx: number) => {
                const mornAmt = (r.morningQty || 0) * (r.morningRate || 0)
                const eveAmt = (r.eveningQty || 0) * (r.eveningRate || 0)
                const daily = mornAmt + eveAmt
                return (
                    <View key={idx} style={[styles.row, { backgroundColor: idx % 2 ? '#fff' : '#fbfbff' }]}>
                        <Text style={[styles.cell, { width: '12%' }]}>{format(parseISO(r.date), 'dd MMM yyyy')}</Text>
                        <Text style={[styles.cell, { width: '8%' }]}>{format(parseISO(r.date), 'EEE')}</Text>
                        <Text style={[styles.cell, { width: '9%' }]}>{r.morningQty || 0}</Text>
                        <Text style={[styles.cell, { width: '9%' }]}>{r.morningRate ? `₹${r.morningRate}` : '-'}</Text>
                        <Text style={[styles.cell, { width: '9%' }]}>{`₹${mornAmt}`}</Text>
                        <Text style={[styles.cell, { width: '9%' }]}>{r.eveningQty || 0}</Text>
                        <Text style={[styles.cell, { width: '9%' }]}>{r.eveningRate ? `₹${r.eveningRate}` : '-'}</Text>
                        <Text style={[styles.cell, { width: '9%' }]}>{`₹${eveAmt}`}</Text>
                        <Text style={[styles.cell, { width: '16%' }]}>{`₹${daily}`}</Text>
                    </View>
                )
            })}
        </View>
    )
}
