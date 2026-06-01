import React from 'react';
import { Payment } from '@/types/invoice.type';

export default function PaymentDetails({ payment }: { payment: Payment }) {
    return (
        <div className="p-4 rounded-xl bg-white shadow-sm w-full">
            <h4 className="text-sm font-semibold text-gray-700">PAYMENT DETAILS</h4>
            <div className="mt-3 text-sm text-gray-600">
                <div className="flex justify-between">
                    <span>Payment Method</span>
                    <span>{payment.method}</span>
                </div>
                <div className="flex justify-between mt-2">
                    <span>Transaction ID</span>
                    <span>{payment.transactionId}</span>
                </div>
                <div className="flex justify-between mt-2">
                    <span>Payment Date</span>
                    <span>{payment.paymentDate}</span>
                </div>
                <div className="flex justify-between mt-2">
                    <span>Status</span>
                    <span className="text-green-600">{payment.status}</span>
                </div>
            </div>

            <div className="mt-4 p-3 rounded bg-gray-50 text-sm">
                <strong>Thank you!</strong>
                <div className="text-muted">We appreciate your trust in our service. Stay healthy, stay happy!</div>
            </div>
        </div>
    );
}
