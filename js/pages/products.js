import DB from '../db.js';

const Products = {
    render: (container) => {
        const products = DB.get('products') || [];
        
        container.innerHTML = `
            <div class="max-w-[1600px] mx-auto flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
                
                <!-- KPI Section -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    ${Products.renderKPI('Total de Produtos', products.length, 'inventory_2', 'primary', [30, 40, 35, 50, 49, 60])}
                    ${Products.renderKPI('Ativos', products.filter(p => p.status).length, 'check_circle', 'green', [10, 20, 15, 30, 25, 40])}
                    ${Products.renderKPI('Sem Estoque', products.filter(p => (p.stock || 0) === 0).length, 'error_outline', 'red', [5, 2, 8, 4, 10, 3])}
                    ${Products.renderKPI('Lucro Médio', 'R$ 1.250', 'payments', 'blue', [20, 25, 30, 28, 35, 45])}
                    ${Products.renderKPI('Mais Vendido', 'Banner Lona', 'trending_up', 'purple', [10, 15, 20, 18, 22, 30])}
                </div>

                <!-- Action Bar -->
                <div class="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div class="relative w-full md:w-96">
                        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input type="text" placeholder="Buscar produtos por nome, SKU ou categoria..." class="pl-11 py-2 text-sm bg-slate-50 border-none">
                    </div>
                    <div class="flex items-center gap-3 w-full md:w-auto">
                        <button class="flex-1 md:flex-none flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-semibold transition-all">
                            <span class="material-symbols-outlined text-[20px]">tune</span>
                            Filtros Avançados
                        </button>
                        <button id="btn-add-product" class="btn-primary flex items-center gap-2">
                            <span class="material-symbols-outlined text-[20px]">add</span>
                            Novo Produto
                        </button>
                    </div>
                </div>

                <!-- Premium Product Table -->
                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-slate-50/50 border-b border-slate-100">
                                    <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Produto</th>
                                    <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">SKU / Cat</th>
                                    <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Margem</th>
                                    <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Preço</th>
                                    <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Estoque</th>
                                    <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                                    <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-50">
                                ${products.map(p => Products.renderRow(p)).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Ultra Premium Modal -->
            ${Products.renderModal()}
        `;

        setTimeout(() => Products.initEvents(container), 0);
    },

    renderKPI: (label, value, icon, color, sparkline) => {
        const colorMap = { primary: '#6C2BFF', green: '#10b981', red: '#ef4444', blue: '#3b82f6', purple: '#8b5cf6' };
        return `
            <div class="kpi-card group">
                <div class="flex justify-between items-start">
                    <div class="p-3 rounded-2xl bg-slate-50 text-slate-600 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <span class="material-symbols-outlined">${icon}</span>
                    </div>
                    <div class="flex flex-col items-end">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tight">${label}</span>
                        <span class="text-2xl font-black text-slate-800">${value}</span>
                    </div>
                </div>
                <div class="mt-4 h-8 w-full opacity-50 group-hover:opacity-100 transition-opacity">
                    <svg viewBox="0 0 100 20" class="w-full h-full"><path d="M0,20 ${sparkline.map((v, i) => `L${i*20},${20-v/4}`).join(' ')}" fill="none" stroke="${colorMap[color]}" stroke-width="2" vector-effect="non-scaling-stroke" /></svg>
                </div>
            </div>
        `;
    },

    renderRow: (p) => {
        const cost = parseFloat(p.cost || 0);
        const price = parseFloat(p.price || 0);
        const margin = price > 0 ? (((price - cost) / price) * 100).toFixed(0) : 0;
        const marginColor = margin > 40 ? 'emerald' : (margin > 20 ? 'blue' : 'orange');
        return `
            <tr class="hover:bg-slate-50/80 transition-colors group">
                <td class="px-6 py-5">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                            ${p.image ? `<img src="${p.image}" class="w-full h-full object-cover">` : `<span class="material-symbols-outlined text-slate-300">image</span>`}
                        </div>
                        <div>
                            <p class="text-sm font-bold text-slate-800">${p.name}</p>
                            <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">${p.type || 'UNIDADE'}</p>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-5">
                    <p class="text-xs font-bold text-slate-700">${p.ref || 'SEM-SKU'}</p>
                    <p class="text-xs text-slate-500">${p.category}</p>
                </td>
                <td class="px-6 py-5 text-right">
                    <span class="px-2 py-1 rounded-lg bg-${marginColor}-50 text-${marginColor}-600 text-[10px] font-black uppercase">${margin}% Margem</span>
                </td>
                <td class="px-6 py-5 text-right font-black text-primary">R$ ${price.toFixed(2)}</td>
                <td class="px-6 py-5 text-center">
                    <span class="text-sm font-bold text-slate-700">${p.stock || 0}</span>
                </td>
                <td class="px-6 py-5 text-center">
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${p.status ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}">
                        <div class="w-1.5 h-1.5 rounded-full ${p.status ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}"></div>
                        ${p.status ? 'Ativo' : 'Inativo'}
                    </span>
                </td>
                <td class="px-6 py-5 text-center">
                    <div class="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                        <button class="p-2 hover:bg-slate-100 text-slate-400 hover:text-primary rounded-xl transition-all" onclick="window.viewProduct(${p.id})">
                            <span class="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                        <button class="p-2 bg-primary/5 text-primary hover:bg-primary hover:text-white rounded-xl transition-all shadow-sm" onclick="window.editProduct(${p.id})">
                            <span class="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button class="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-xl transition-all" onclick="window.deleteProduct(${p.id})">
                            <span class="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },

    renderModal: () => `
        <div id="product-modal" class="hidden fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div class="modal-content-glass w-full max-w-[1200px] rounded-[40px] overflow-hidden flex flex-col md:flex-row max-h-[95vh] animate-in zoom-in-95 duration-300">
                
                <!-- Main Content Area (Left) -->
                <div class="flex-1 flex flex-col min-w-0 bg-white">
                    <div class="p-10 border-b border-slate-100 bg-slate-50/20">
                        <div class="flex justify-between items-start mb-8">
                            <div class="flex items-center gap-5">
                                <div class="w-16 h-16 rounded-[24px] bg-primary/10 flex items-center justify-center text-primary animate-float shadow-inner">
                                    <span class="material-symbols-outlined text-4xl">inventory_2</span>
                                </div>
                                <div>
                                    <div class="flex items-center gap-3">
                                        <h3 class="text-3xl font-black text-slate-800 tracking-tighter">Novo Produto Gráfico</h3>
                                        <span class="status-badge bg-primary/10 text-primary">Novo</span>
                                    </div>
                                    <p class="text-sm text-slate-400 font-semibold mt-1">Configure detalhes técnicos, precificação inteligente e fluxo de produção.</p>
                                </div>
                            </div>
                            <button id="close-modal-x" class="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-300 hover:text-slate-600">
                                <span class="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <!-- Premium SaaS Tabs -->
                        <div class="flex gap-1 p-1.5 bg-slate-100/50 rounded-2xl w-fit">
                            <button class="nav-tab-saas active" data-tab="geral"><span class="material-symbols-outlined text-lg">settings</span> Geral</button>
                            <button class="nav-tab-saas" data-tab="preco"><span class="material-symbols-outlined text-lg">account_balance_wallet</span> Precificação</button>
                            <button class="nav-tab-saas" data-tab="producao"><span class="material-symbols-outlined text-lg">precision_manufacturing</span> Produção</button>
                            <button class="nav-tab-saas" data-tab="estoque"><span class="material-symbols-outlined text-lg">layers</span> Estoque</button>
                            <button class="nav-tab-saas" data-tab="arquivos"><span class="material-symbols-outlined text-lg">cloud_upload</span> Arquivos</button>
                        </div>
                    </div>

                    <div class="flex-1 overflow-y-auto p-10 scrollbar-hide bg-slate-50/20">
                        <form id="form-product" class="space-y-8">
                            <!-- Aba Geral -->
                            <div id="tab-geral" class="tab-content space-y-8">
                                <div class="section-card">
                                    <div class="section-header">
                                        <div class="section-icon"><span class="material-symbols-outlined">info</span></div>
                                        <h4 class="section-title">Informações Básicas</h4>
                                    </div>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div class="space-y-3">
                                            <label>Nome do Produto Profissional</label>
                                            <div class="input-group-icon">
                                                <span class="material-symbols-outlined">edit_note</span>
                                                <input type="text" id="p-name" placeholder="Ex: Cartão de Visita Couchê 300g" required>
                                            </div>
                                        </div>
                                        <div class="space-y-3">
                                            <label>SKU / Referência Interna</label>
                                            <div class="input-group-icon">
                                                <span class="material-symbols-outlined">barcode</span>
                                                <input type="text" id="p-ref" placeholder="EX: CV-300-UV">
                                            </div>
                                        </div>
                                    </div>
                                    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
                                        <div class="space-y-3">
                                            <label>Categoria</label>
                                            <select id="p-category">
                                                <option>Cartões de Visita</option>
                                                <option>Banners e Lonas</option>
                                                <option>Adesivos e Rótulos</option>
                                                <option>Papelaria Corporativa</option>
                                            </select>
                                        </div>
                                        <div class="md:col-span-2 space-y-3">
                                            <label>Descrição Técnica Detalhada</label>
                                            <textarea id="p-description" class="h-24" placeholder="Especifique materiais, gramaturas e detalhes para a equipe..."></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Aba Preco -->
                            <div id="tab-preco" class="tab-content hidden space-y-8">
                                <div class="section-card">
                                    <div class="section-header">
                                        <div class="section-icon"><span class="material-symbols-outlined">account_balance_wallet</span></div>
                                        <h4 class="section-title">Precificação e Rentabilidade</h4>
                                    </div>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div class="space-y-4">
                                            <div class="space-y-2">
                                                <label>Tipo de Venda</label>
                                                <select id="p-type"><option>Unidade</option><option>m²</option><option>Milheiro</option><option>Cento</option><option>Pacote</option></select>
                                            </div>
                                            <div class="space-y-2">
                                                <label>Custo de Produção</label>
                                                <div class="relative">
                                                    <span class="input-prefix">R$</span>
                                                    <input type="number" id="p-cost" class="pl-12" step="0.01" value="0.00">
                                                </div>
                                            </div>
                                        </div>
                                        <div class="space-y-4 p-8 bg-primary/[0.03] rounded-[32px] border border-primary/10">
                                            <div class="flex justify-between items-center">
                                                <label class="text-primary !m-0">Margem de Lucro</label>
                                                <span id="margin-val" class="text-2xl font-black text-primary tracking-tighter">100%</span>
                                            </div>
                                            <input type="range" id="p-margin" min="0" max="1000" step="5" value="100" class="accent-primary w-full h-2 bg-white rounded-lg appearance-none cursor-pointer">
                                            <p class="text-[10px] text-slate-400 font-bold text-center">Cálculo dinâmico baseado no custo de insumos</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Aba Produção -->
                            <div id="tab-producao" class="tab-content hidden space-y-8">
                                <div class="section-card">
                                    <div class="section-header">
                                        <div class="section-icon"><span class="material-symbols-outlined">precision_manufacturing</span></div>
                                        <h4 class="section-title">Configurações de Produção</h4>
                                    </div>
                                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        <div class="space-y-3">
                                            <label>Equipamento Principal</label>
                                            <select><option>Impressora UV</option><option>Offset 4 Cores</option><option>Plotter de Recorte</option><option>Laser CO2</option></select>
                                        </div>
                                        <div class="space-y-3">
                                            <label>Tempo Est. (Horas)</label>
                                            <input type="number" placeholder="2">
                                        </div>
                                        <div class="space-y-3">
                                            <label>Prioridade</label>
                                            <select><option>Normal</option><option class="text-orange-500">Urgente</option><option class="text-red-500">Crítico</option></select>
                                        </div>
                                    </div>
                                    <div class="mt-8 p-8 bg-slate-50 rounded-[32px] flex items-center justify-between border border-slate-100">
                                        <div>
                                            <p class="text-sm font-black text-slate-700">Produto Personalizável?</p>
                                            <p class="text-xs text-slate-400 font-semibold">Este item exige que o cliente envie arquivos para produção.</p>
                                        </div>
                                        <label class="relative inline-flex items-center cursor-pointer !m-0">
                                            <input type="checkbox" class="sr-only peer" checked>
                                            <div class="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <!-- Aba Estoque -->
                            <div id="tab-estoque" class="tab-content hidden space-y-8">
                                <div class="section-card">
                                    <div class="section-header">
                                        <div class="section-icon"><span class="material-symbols-outlined">layers</span></div>
                                        <h4 class="section-title">Controle de Estoque</h4>
                                    </div>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div class="space-y-6 p-8 bg-white rounded-[32px] border border-slate-100 shadow-sm">
                                            <div class="flex justify-between items-center">
                                                <p class="text-xs font-black text-slate-400 uppercase">Nível de Estoque Atual</p>
                                                <span class="status-badge bg-emerald-100 text-emerald-600">Em Estoque</span>
                                            </div>
                                            <div class="space-y-2">
                                                <div class="flex justify-between text-sm font-black text-slate-700">
                                                    <span>150 Unidades</span>
                                                    <span>Máx: 200</span>
                                                </div>
                                                <div class="stock-bar-container"><div class="stock-bar-fill bg-emerald-500" style="width: 75%"></div></div>
                                            </div>
                                        </div>
                                        <div class="grid grid-cols-2 gap-6">
                                            <div class="p-6 bg-slate-50 rounded-[24px]">
                                                <p class="text-[10px] font-black text-slate-400 uppercase mb-2">Mínimo</p>
                                                <input type="number" value="20" class="bg-transparent border-none text-2xl font-black p-0 focus:ring-0">
                                            </div>
                                            <div class="p-6 bg-slate-50 rounded-[24px]">
                                                <p class="text-[10px] font-black text-slate-400 uppercase mb-2">Consumo/Mês</p>
                                                <p class="text-2xl font-black text-slate-700">45</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Aba Arquivos -->
                            <div id="tab-arquivos" class="tab-content hidden space-y-8">
                                <div class="section-card">
                                    <div class="section-header">
                                        <div class="section-icon"><span class="material-symbols-outlined">cloud_upload</span></div>
                                        <h4 class="section-title">Upload de Arquivos</h4>
                                    </div>
                                    <input type="file" id="p-image-input" class="hidden" accept="image/*,.pdf,.ai,.cdr">
                                    <div id="p-upload-area" class="dropzone-premium p-16 flex flex-col items-center justify-center gap-5 text-center cursor-pointer group">
                                        <div class="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                            <span class="material-symbols-outlined text-5xl">cloud_upload</span>
                                        </div>
                                        <div>
                                            <h4 class="text-lg font-black text-slate-800">Arraste seus arquivos aqui</h4>
                                            <p class="text-sm text-slate-400 font-semibold mt-1">Suporta PDF, AI, CorelDraw e Imagens.</p>
                                        </div>
                                        <button type="button" class="btn-primary py-3">Selecionar Arquivo</button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>

                    <div class="p-10 border-t border-slate-100 flex justify-end gap-5 bg-slate-50/20">
                        <button type="button" id="close-modal-cancel" class="btn-ghost">Cancelar</button>
                        <button form="form-product" type="submit" id="btn-save-product" class="btn-primary group relative overflow-hidden px-10">
                            <span class="flex items-center gap-3 relative z-10">
                                <span class="material-symbols-outlined text-lg">check_circle</span>
                                Salvar Produto
                            </span>
                        </button>
                    </div>
                </div>

                <!-- Intelligence Panel (Right) -->
                <div class="hidden lg:flex sidebar-summary w-[400px] p-10 flex-col gap-10 overflow-y-auto scrollbar-hide bg-[#fdfcff]">
                    <div class="space-y-2">
                        <h4 class="text-[11px] font-black text-slate-400 uppercase tracking-[3px]">Inteligência de Dados</h4>
                        <p class="text-xs text-slate-400 font-semibold italic">Análise preditiva para este produto.</p>
                    </div>
                    
                    <!-- Preview Card -->
                    <div class="flex flex-col items-center p-10 bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-100/50 animate-float">
                        <div id="summary-img-prev" class="w-32 h-32 rounded-[32px] bg-slate-50 flex items-center justify-center mb-6 border border-slate-100 overflow-hidden shadow-inner">
                            <span class="material-symbols-outlined text-5xl text-slate-200">image</span>
                        </div>
                        <h5 id="summary-name" class="text-xl font-black text-slate-800 text-center leading-tight">Aguardando Nome...</h5>
                        <div class="mt-4 flex gap-2">
                            <span id="summary-cat" class="status-badge bg-slate-100 text-slate-500">Categoria</span>
                            <span class="status-badge bg-primary/5 text-primary">ID: NOVO</span>
                        </div>
                    </div>

                    <!-- Financial Metrics -->
                    <div class="space-y-6">
                        <div class="p-6 bg-white rounded-[32px] border border-slate-100 flex justify-between items-center shadow-sm">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                                    <span class="material-symbols-outlined">trending_up</span>
                                </div>
                                <div>
                                    <p class="text-[10px] font-black text-slate-400 uppercase">ROI Previsto</p>
                                    <p class="text-lg font-black text-emerald-500" id="roi-val">0%</p>
                                </div>
                            </div>
                            <div class="w-16 h-8 opacity-40">
                                <svg viewBox="0 0 100 40" class="w-full h-full"><path d="M0,40 Q25,10 50,30 T100,0" fill="none" stroke="#10b981" stroke-width="3"/></svg>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-6">
                            <div class="p-6 bg-white rounded-[32px] border border-slate-100">
                                <p class="text-[10px] font-black text-slate-400 uppercase mb-1">Custo Base</p>
                                <p class="text-lg font-black text-slate-800" id="cost-val">R$ 0,00</p>
                            </div>
                            <div class="p-6 bg-white rounded-[32px] border border-slate-100">
                                <p class="text-[10px] font-black text-slate-400 uppercase mb-1">Preço Sugerido</p>
                                <p class="text-lg font-black text-primary" id="display-price-mini">R$ 0,00</p>
                            </div>
                        </div>
                    </div>

                    <!-- Dynamic Profit Card -->
                    <div id="profit-card" class="p-8 bg-slate-900 rounded-[40px] text-white shadow-2xl shadow-primary/20 relative overflow-hidden">
                        <div class="absolute -right-10 -bottom-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl"></div>
                        <p class="text-[11px] font-black uppercase opacity-60 tracking-widest mb-4">Lucro Líquido Estimado</p>
                        <h6 class="text-4xl font-black tracking-tighter mb-2" id="display-profit">R$ 0,00</h6>
                        <div class="flex items-center gap-2 text-xs font-bold text-emerald-400">
                            <span class="material-symbols-outlined text-sm">bolt</span>
                            Rentabilidade Alta
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,

    initEvents: (container) => {
        const modal = document.getElementById('product-modal');
        const btnAdd = document.getElementById('btn-add-product');
        const closeBtns = ['close-modal-x', 'close-modal-cancel'];
        
        const costInput = document.getElementById('p-cost');
        const marginInput = document.getElementById('p-margin');
        const marginDisplay = document.getElementById('margin-val');
        const imageInput = document.getElementById('p-image-input');
        const uploadArea = document.getElementById('p-upload-area');
        
        let currentImageData = '';
        let editingId = null;

        const openModal = (id = null) => {
            editingId = id;
            const form = document.getElementById('form-product');
            form.reset();
            currentImageData = '';
            
            if (id) {
                const products = DB.get('products') || [];
                const p = products.find(item => item.id === id);
                if (p) {
                    document.getElementById('p-name').value = p.name;
                    document.getElementById('p-ref').value = p.ref || '';
                    document.getElementById('p-category').value = p.category;
                    document.getElementById('p-description').value = p.description || '';
                    document.getElementById('p-type').value = p.type;
                    document.getElementById('p-cost').value = p.cost;
                    
                    const margin = p.cost > 0 ? (((p.price / p.cost) - 1) * 100).toFixed(0) : 100;
                    document.getElementById('p-margin').value = margin;
                    
                    if (p.image) {
                        currentImageData = p.image;
                        document.getElementById('summary-img-prev').innerHTML = `<img src="${p.image}" class="w-full h-full object-cover">`;
                    }
                    
                    document.querySelector('h3.text-3xl').innerText = 'Editar Produto Gráfico';
                    document.querySelector('.status-badge').innerText = 'ID: ' + p.id;
                }
            } else {
                document.querySelector('h3.text-3xl').innerText = 'Novo Produto Gráfico';
                document.querySelector('.status-badge').innerText = 'Novo';
                document.getElementById('summary-img-prev').innerHTML = `<span class="material-symbols-outlined text-5xl text-slate-200">image</span>`;
            }
            
            modal.classList.remove('hidden');
            Products.updateCalculator();
        };

        const closeModal = () => modal.classList.add('hidden');

        if(btnAdd) btnAdd.onclick = () => openModal();
        
        closeBtns.forEach(id => {
            const btn = document.getElementById(id);
            if(btn) btn.onclick = closeModal;
        });

        // Global Actions
        window.editProduct = (id) => openModal(id);
        window.viewProduct = (id) => openModal(id);

        window.deleteProduct = (id) => {
            import('../app.js').then(m => {
                const App = m.default;
                App.confirm(
                    'Excluir Produto?',
                    'Esta ação é permanente e removerá todos os dados vinculados a este produto.',
                    () => {
                        const current = DB.get('products') || [];
                        DB.save('products', current.filter(p => p.id !== id));
                        Products.render(container);
                    }
                );
            });
        };

        // Tab Navigation
        const tabs = document.querySelectorAll('.nav-tab-saas');
        tabs.forEach(tab => {
            tab.onclick = () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
                const content = document.getElementById(`tab-${tab.dataset.tab}`);
                if(content) content.classList.remove('hidden');
            };
        });

        // Calculator Logic
        const updateCalc = () => {
            const cost = parseFloat(costInput.value) || 0;
            const marginPerc = parseInt(marginInput.value) || 0;
            marginDisplay.innerText = `${marginPerc}%`;
            
            const finalPrice = cost + (cost * (marginPerc / 100));
            const profit = finalPrice - cost;
            const roi = cost > 0 ? ((profit / cost) * 100).toFixed(0) : 0;

            const format = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, style: 'currency', currency: 'BRL' });

            document.getElementById('display-price-mini').innerText = format(finalPrice);
            document.getElementById('display-profit').innerText = format(profit);
            document.getElementById('cost-val').innerText = format(cost);
            document.getElementById('roi-val').innerText = `${roi}%`;
            
            // Sidebar sync
            document.getElementById('summary-name').innerText = document.getElementById('p-name').value || 'Aguardando Nome...';
            document.getElementById('summary-cat').innerText = document.getElementById('p-category').value;
        };

        [costInput, marginInput, document.getElementById('p-name'), document.getElementById('p-category')].forEach(el => {
            el.oninput = updateCalc;
        });

        // Upload Preview
        if(uploadArea && imageInput) {
            uploadArea.onclick = () => imageInput.click();
            imageInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        currentImageData = event.target.result;
                        document.getElementById('summary-img-prev').innerHTML = `<img src="${currentImageData}" class="w-full h-full object-cover">`;
                    };
                    reader.readAsDataURL(file);
                }
            };
        }

        // Form Submit
        document.getElementById('form-product').onsubmit = (e) => {
            e.preventDefault();
            const cost = parseFloat(costInput.value) || 0;
            const margin = parseInt(marginInput.value) || 0;
            const finalPrice = cost + (cost * (margin / 100));

            const products = DB.get('products') || [];
            
            const productData = {
                name: document.getElementById('p-name').value,
                category: document.getElementById('p-category').value,
                ref: document.getElementById('p-ref').value,
                type: document.getElementById('p-type').value,
                cost: cost,
                price: finalPrice,
                image: currentImageData,
                description: document.getElementById('p-description').value,
                stock: 150,
                status: true
            };

            if (editingId) {
                const index = products.findIndex(p => p.id === editingId);
                if (index !== -1) {
                    products[index] = { ...products[index], ...productData };
                }
            } else {
                productData.id = Date.now();
                products.push(productData);
            }
            
            DB.save('products', products);
            closeModal();
            Products.render(container);
        };
    },

    updateCalculator: () => {
        const event = new Event('input');
        document.getElementById('p-cost').dispatchEvent(event);
    }
};

export default Products;
