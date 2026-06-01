import React from 'react';
import { generateQRCodeDataUrl } from '@/lib/utils/qr';

type Props = {
    companyName?: string;
    address?: string;
    phone?: string;
    email?: string;
    upi?: string;
};

export default async function FooterSection({
    companyName = 'Neelkanth Tiffin Service',
    address = '201, Shreeji Complex, Nr. Market Yard, Bapunagar, Ahmedabad - 380024, Gujarat',
    phone = '98765 43210',
    email = 'info@tiffintrack.com',
    upi = 'upi://pay?pa=someone@upi',
}: Props) {
    const qr = await generateQRCodeDataUrl(upi);

    return (
        <footer className="mt-8 border-t pt-6">
            <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                    <div className="font-semibold">{companyName}</div>
                    <div className="mt-1">{address}</div>
                    <div className="mt-1">{phone} | {email}</div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-center">
                        {qr ? <img src={qr} alt="QR" className="w-24 h-24 object-contain" /> : <div className="w-24 h-24 bg-gray-100" />}
                        <div className="text-xs text-gray-500">Scan & Pay</div>
                    </div>

                    <div className="text-sm text-gray-500">
                        <div>Follow us</div>
                        <div className="flex gap-2 mt-2">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#10B981" strokeWidth="1" /></svg>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#3B82F6" strokeWidth="1" /></svg>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#DB2777" strokeWidth="1" /></svg>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
