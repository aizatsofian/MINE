window.D2D = window.D2D || {};

// Centralized WhatsApp message templates so copy stays consistent across the site.
D2D.whatsapp = {
    purchaseMessage(productName, packageAmount, buyerName, buyerPhone) {
        const packageLabel = String(packageAmount) === '180' ? 'Dr Excel Setupkan RM180' : 'Setup Sendiri RM90';
        return `Hi Dr Aizat, saya ingin membeli *${productName}* dengan pakej ${packageLabel}.\n\nNama: ${buyerName}\nNo. Tel: ${buyerPhone}\n\nSaya telah membuat pembayaran dan ini adalah lampiran bukti resit saya.`;
    },

    demoRequestMessage(productName) {
        return `Hi Dr Aizat, saya ingin mendapatkan demo Power BI untuk ${productName}.`;
    }
};
