import React from 'react'
import { View, Text, Image, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
    container: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#eee' },
    left: { width: '65%' },
    right: { width: '30%', textAlign: 'right' },
    label: { fontSize: 9, color: '#555' },
    value: { fontSize: 10 }
})

export default function PaymentDetails({ payment, qrDataUrl }: any) {
    return (
        <View style={styles.container}>
            <View style={styles.left}>
                <Text style={styles.label}>Payment Method: <Text style={styles.value}>{payment?.method || '---'}</Text></Text>
                <Text style={styles.label}>Transaction ID: <Text style={styles.value}>{payment?.transactionId || '---'}</Text></Text>
                <Text style={styles.label}>Payment Date: <Text style={styles.value}>{payment?.date || '---'}</Text></Text>
                <Text style={styles.label}>Status: <Text style={styles.value}>{payment?.status || '---'}</Text></Text>
            </View>
            <View style={styles.right}>
                {qrDataUrl && <Image src={qrDataUrl} style={{ width: 90, height: 90 }} />}
                {payment?.upi && <Text style={[styles.label, { marginTop: 6 }]}>UPI: {payment.upi}</Text>}
            </View>
        </View>
    )
}
