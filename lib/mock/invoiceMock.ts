import { InvoiceData, Customer } from '@/types/invoice.type';

type MockOptions = {
    id?: string;
    customer?: Partial<Customer>;
    startDate?: string; // ISO yyyy-mm-dd
    endDate?: string;
};

export function getMockInvoice(opts: string | MockOptions = 'inv_001'): InvoiceData {
    const { id = 'inv_001', customer: custOpts, startDate, endDate } =
        typeof opts === 'string' ? { id: opts } : opts;

    const start = startDate ? new Date(startDate) : new Date('2026-05-01');
    const end = endDate ? new Date(endDate) : new Date(start.getFullYear(), start.getMonth(), start.getDate() + 23);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const items = Array.from({ length: days }).map((_, idx) => {
        const d = new Date(start);
        d.setDate(start.getDate() + idx);
        const date = d.toISOString().slice(0, 10);
        const day = d.toLocaleDateString('en-US', { weekday: 'short' });
        const morning = 1;
        const evening = 1;
        const totalTiffins = morning + evening;
        const rate = 60;
        const amount = totalTiffins * rate;
        return { date, day, morning, evening, totalTiffins, rate, amount };
    });

    const subtotal = items.reduce((s, it) => s + it.amount, 0);

    const invoice = {
        id,
        invoiceNo: `TT-INV-${id}`,
        invoiceDate: new Date().toISOString().slice(0, 10),
        billingPeriod: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
        totalDays: days,
        totalTiffins: items.reduce((s, it) => s + it.totalTiffins, 0),
        rate: 60,
        subtotal,
        discount: 0,
        otherCharges: 0,
        totalAmount: subtotal,
        paidAmount: subtotal,
        status: 'Paid',
    };

    const customer = {
        id: custOpts?.id ?? 'c_01',
        name: custOpts?.name ?? 'Mitesh Patel',
        phone: custOpts?.phone ?? '98765 43210',
        address: custOpts?.address ?? 'Satellite, Ahmedabad, Gujarat - 380015',
    } as Customer;

    const payment = {
        method: 'UPI',
        transactionId: 'UPI/412356789012',
        paymentDate: new Date().toISOString().slice(0, 10),
        status: 'Paid',
    };

    return { customer, invoice, payment, items };
}
