const Reports = {
    render: (container) => {
        container.innerHTML = `
            <div class="max-w-[1440px] mx-auto flex flex-col gap-8">
                <h2 class="text-3xl font-bold">Relatórios Gerenciais</h2>
                <div class="bg-surface p-8 rounded-xl border border-dashed border-outline-variant/30 text-center">
                    <span class="material-symbols-outlined text-5xl text-outline-variant mb-2">analytics</span>
                    <p class="text-on-surface-variant">Análise de produtividade e lucratividade em desenvolvimento.</p>
                </div>
            </div>
        `;
    }
};
export default Reports;
