export type InvoiceItem = {
    date: string;
    day: string;
    morning: number;
    evening: number;
    totalTiffins: number;
    rate: number;
    amount: number;
};

export type Customer = {
    id: string;
    name: string;
    phone?: string;
    address?: string;
};

export type Invoice = {
    id: string;
    invoiceNo: string;
    invoiceDate: string;
    billingPeriod: string;
    totalDays: number;
    totalTiffins: number;
    rate: number;
    subtotal: number;
    discount: number;
    otherCharges: number;
    totalAmount: number;
    paidAmount: number;
    status: string;
};

export type Payment = {
    method: string;
    transactionId?: string;
    paymentDate?: string;
    status?: string;
};

export type InvoiceData = {
    customer: Customer;
    invoice: Invoice;
    payment: Payment;
    items: InvoiceItem[];
};
