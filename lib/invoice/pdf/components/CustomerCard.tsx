import React from 'react'
import { View, Text, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
    card: { borderRadius: 6, borderWidth: 1, borderColor: '#eee', padding: 8, marginBottom: 12 },
    name: { fontSize: 12, fontWeight: '700' },
    small: { fontSize: 9, color: '#444', marginTop: 2 }
})

export default function CustomerCard({ customer }: any) {
    if (!customer) return null
    return (
        <View style={styles.card}>
            <Text style={styles.name}>{customer.name} {customer.customerCode ? `(${customer.customerCode})` : ''}</Text>
            <Text style={styles.small}>Phone: {customer.mobile}</Text>
            {customer.email && <Text style={styles.small}>Email: {customer.email}</Text>}
            {customer.address && <Text style={styles.small}>Address: {customer.address}</Text>}
            {customer.customerSince && <Text style={styles.small}>Customer Since: {customer.customerSince}</Text>}
        </View>
    )
}
