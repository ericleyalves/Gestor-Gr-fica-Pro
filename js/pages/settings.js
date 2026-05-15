const Settings = {
    render: (container) => {
        container.innerHTML = `
            <div class="max-w-[1440px] mx-auto flex flex-col gap-8">
                <h2 class="text-3xl font-bold">Configurações do Sistema</h2>
                <div class="bg-surface p-8 rounded-xl border border-outline-variant/10 space-y-6">
                    <div>
                        <h4 class="font-bold text-on-surface mb-4">Perfil da Gráfica</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" class="bg-surface-container p-3 rounded-lg" value="Minha Gráfica Pro" placeholder="Nome Fantasia">
                            <input type="text" class="bg-surface-container p-3 rounded-lg" value="12.345.678/0001-90" placeholder="CNPJ">
                        </div>
                    </div>
                    <div>
                        <h4 class="font-bold text-on-surface mb-4">Preferências</h4>
                        <label class="flex items-center gap-2">
                            <input type="checkbox" checked>
                            <span>Notificações de Novos Pedidos</span>
                        </label>
                    </div>
                    <button class="bg-primary text-white px-6 py-2 rounded-lg font-bold">Salvar Alterações</button>
                </div>
            </div>
        `;
    }
};
export default Settings;
