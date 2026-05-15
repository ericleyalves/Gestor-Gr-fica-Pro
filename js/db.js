const DB = {
    save: (key, data) => {
        localStorage.setItem(`ggp_${key}`, JSON.stringify(data));
    },
    get: (key) => {
        const data = localStorage.getItem(`ggp_${key}`);
        return data ? JSON.parse(data) : null;
    },
    init: () => {
        if (!DB.get('products')) {
            DB.save('products', [
                { id: 1, name: 'Cartão Couchê 300g UV Total', category: 'Cartão de visita', type: 'Milheiro', cost: 25.00, price: 45.00, status: true, ref: 'CC300UV-F' },
                { id: 2, name: 'Lona Brilho 440g - Ilhós', category: 'Lona', type: 'm²', cost: 18.50, price: 40.00, status: true, ref: 'LB440-IL' },
                { id: 3, name: 'Adesivo Vinil Fosco Recorte', category: 'Adesivo', type: 'm²', cost: 22.00, price: 55.00, status: false, ref: 'AVF-REC' }
            ]);
        }
        if (!DB.get('customers')) {
            DB.save('customers', [
                { id: 1, name: 'Agência CriaMais', email: 'contato@criamais.com', phone: '(11) 99999-9999', document: '12.345.678/0001-90' },
                { id: 2, name: 'Restaurante Bella', email: 'bella@gmail.com', phone: '(11) 88888-8888', document: '98.765.432/0001-10' }
            ]);
        }
        if (!DB.get('orders')) {
            DB.save('orders', [
                { id: 'ORD-0921', customerId: 1, productName: '1000x Cartões Couché 300g', value: 185.00, status: 'Concluído', date: '2026-05-15' },
                { id: 'ORD-0922', customerId: 2, productName: 'Banner Lona Fosca 2x1m', value: 120.00, status: 'Produção', date: '2026-05-15' },
                { id: 'ORD-0923', customerId: 1, productName: '5000x Panfletos A5 90g', value: 450.00, status: 'Aguardando Arte', date: '2026-05-15' }
            ]);
        }
    }
};

DB.init();
export default DB;
