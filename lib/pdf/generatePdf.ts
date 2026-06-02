import puppeteer, { type Browser } from 'puppeteer';

export default async function generatePdf(url: string) {
    let browser: Browser | null = null;
    try {
        browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 800 });
        await page.goto(url, { waitUntil: 'networkidle0' });

        const buffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' },
        });

        return buffer;
    } catch (err) {
        console.error('generatePdf error', err);
        throw err;
    } finally {
        if (browser) await browser.close();
    }
}
