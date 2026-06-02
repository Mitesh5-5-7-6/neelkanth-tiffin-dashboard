import QRCode, { type QRCodeToDataURLOptions } from 'qrcode';

export async function generateQRCodeDataUrl(text: string, opts: QRCodeToDataURLOptions = {}) {
    try {
        const dataUrl = await QRCode.toDataURL(text, { margin: 0, scale: 6, ...opts });
        return dataUrl;
    } catch (err) {
        console.error('QR generation failed', err);
        return '';
    }
}
