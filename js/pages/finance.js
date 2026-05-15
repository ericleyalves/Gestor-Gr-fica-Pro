const Finance = {
    render: (container) => {
        container.innerHTML = `
            <div class="max-w-[1440px] mx-auto flex flex-col gap-8">
                <h2 class="text-3xl font-bold">Financeiro</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="bg-surface p-6 rounded-xl shadow-sm border border-outline-variant/10">
                        <p class="text-xs font-bold text-on-surface-variant uppercase">Contas a Receber</p>
                        <h3 class="text-2xl font-bold text-green-600 mt-1">R$ 12.450,00</h3>
                    </div>
                    <div class="bg-surface p-6 rounded-xl shadow-sm border border-outline-variant/10">
                        <p class="text-xs font-bold text-on-surface-variant uppercase">Contas a Pagar</p>
                        <h3 class="text-2xl font-bold text-red-600 mt-1">R$ 4.200,00</h3>
                    </div>
                    <div class="bg-surface p-6 rounded-xl shadow-sm border border-outline-variant/10">
                        <p class="text-xs font-bold text-on-surface-variant uppercase">Fluxo de Caixa (Mês)</p>
                        <h3 class="text-2xl font-bold text-primary mt-1">R$ 8.250,00</h3>
                    </div>
                </div>
                <div class="bg-surface p-8 rounded-xl border border-dashed border-outline-variant/30 text-center">
                    <span class="material-symbols-outlined text-5xl text-outline-variant mb-2">account_balance</span>
                    <p class="text-on-surface-variant">Módulo financeiro completo em desenvolvimento.</p>
                </div>
            </div>
        `;
    }
};
export default Finance;
