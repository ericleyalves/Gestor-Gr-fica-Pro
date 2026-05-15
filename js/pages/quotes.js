import DB from '../db.js';

const Quotes = {
    currentItems: [], // Carrinho temporário do orçamento atual
    editingItemId: null,

    render: (container) => {
        const quotes = DB.get('quotes') || [];
        const customers = DB.get('customers') || [];
        
        const fmtBRL = (v) => parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        container.innerHTML = `
            <div class="max-w-[1600px] mx-auto flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
                
                <!-- Header -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 class="text-3xl font-black text-slate-800">Orçamentos Profissionais</h2>
                        <p class="text-slate-500 font-medium">Monte pedidos multitens e compartilhe propostas irresistíveis.</p>
                    </div>
                    <button id="btn-add-quote" class="btn-primary">
                        <span class="material-symbols-outlined">add_shopping_cart</span>
                        Novo Orçamento
                    </button>
                </div>

                <!-- Stats/Filters Quick Row -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
                        <div class="w-12 h-12 rounded-xl bg-indigo-50 text-primary flex items-center justify-center">
                            <span class="material-symbols-outlined">description</span>
                        </div>
                        <div>
                            <p class="text-[10px] font-black text-slate-400 uppercase">Total de Propostas</p>
                            <p class="text-xl font-black text-slate-800">${quotes.length}</p>
                        </div>
                    </div>
                    <div class="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
                        <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <span class="material-symbols-outlined">check_circle</span>
                        </div>
                        <div>
                            <p class="text-[10px] font-black text-slate-400 uppercase">Convertidos em Venda</p>
                            <p class="text-xl font-black text-slate-800">${quotes.filter(q => q.status === 'Aprovado').length}</p>
                        </div>
                    </div>
                    <div class="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
                        <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <span class="material-symbols-outlined">pending_actions</span>
                        </div>
                        <div>
                            <p class="text-[10px] font-black text-slate-400 uppercase">Aguardando Resposta</p>
                            <p class="text-xl font-black text-slate-800">${quotes.filter(q => q.status === 'Pendente').length}</p>
                        </div>
                    </div>
                </div>

                <!-- List Section -->
                <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                                    <th class="px-6 py-4">Proposta / Data</th>
                                    <th class="px-6 py-4">Cliente / Contato</th>
                                    <th class="px-6 py-4">Itens</th>
                                    <th class="px-6 py-4 text-right">Valor Total</th>
                                    <th class="px-6 py-4 text-center">Status</th>
                                    <th class="px-6 py-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-50">
                                ${quotes.length === 0 ? `
                                    <tr>
                                        <td colspan="6" class="px-6 py-20 text-center">
                                            <div class="flex flex-col items-center gap-4 opacity-30">
                                                <span class="material-symbols-outlined text-6xl">request_quote</span>
                                                <p class="text-lg font-bold">Nenhum orçamento gerado ainda.</p>
                                                <button id="btn-add-quote-empty" class="btn-primary mt-2">Começar Primeiro Pedido</button>
                                            </div>
                                        </td>
                                    </tr>
                                ` : quotes.map(q => {
                                    const badgeClass = q.status === 'Aprovado' ? 'badge-green' : q.status === 'Cancelado' ? 'badge-red' : 'badge-purple';
                                    return `
                                        <tr class="hover:bg-slate-50/80 transition-colors group">
                                            <td class="px-6 py-5">
                                                <p class="text-sm font-black text-primary">${q.id}</p>
                                                <p class="text-[10px] font-bold text-slate-400 uppercase">${q.date}</p>
                                            </td>
                                            <td class="px-6 py-5">
                                                <p class="text-sm font-black text-slate-700">${q.customerName}</p>
                                                <p class="text-xs font-bold text-slate-400">${q.whatsapp || 'Sem contato'}</p>
                                            </td>
                                            <td class="px-6 py-5">
                                                <div class="flex flex-wrap gap-1">
                                                    ${(q.items || []).slice(0, 2).map(it => `<span class="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-black text-slate-600 uppercase">${it.name}</span>`).join('')}
                                                    ${q.items && q.items.length > 2 ? `<span class="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-black text-slate-600 uppercase">+${q.items.length - 2}</span>` : ''}
                                                </div>
                                            </td>
                                            <td class="px-6 py-5 text-right font-black text-slate-800">
                                                ${fmtBRL(q.value)}
                                            </td>
                                            <td class="px-6 py-5 text-center">
                                                <span class="badge ${badgeClass}">${q.status}</span>
                                            </td>
                                            <td class="px-6 py-5">
                                                <div class="flex justify-center gap-1">
                                                    <button onclick="window.shareQuote('${q.id}')" class="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all" title="WhatsApp"><span class="material-symbols-outlined text-[20px]">share</span></button>
                                                    <button onclick="window.convertToSale('${q.id}')" class="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Aprovar"><span class="material-symbols-outlined text-[20px]">check_circle</span></button>
                                                    <button onclick="window.editQuote('${q.id}')" class="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-all" title="Editar"><span class="material-symbols-outlined text-[20px]">edit</span></button>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- MODAL ORÇAMENTO MULTITENS -->
            <div id="quote-modal" class="modal-overlay hidden">
                <div class="modal-container max-w-[1200px] h-[90vh] flex flex-col overflow-hidden">
                    
                    <!-- Header -->
                    <div class="px-8 py-6 border-b flex justify-between items-center bg-white" style="border-color:var(--border);">
                        <div>
                            <h3 class="text-xl font-black text-slate-800">Montar Novo Orçamento</h3>
                            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">PROPOSTA #${Math.random().toString(36).substr(2, 6).toUpperCase()}</p>
                        </div>
                        <button id="close-quote-modal" class="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <!-- Body -->
                    <div class="flex-1 flex overflow-hidden bg-slate-50">
                        
                        <!-- LEFT: Item List & Forms (65%) -->
                        <div class="flex-1 overflow-y-auto p-8 space-y-8">
                            
                            <!-- 1. Cliente -->
                            <div class="section-card">
                                <div class="section-header">
                                    <div class="section-icon"><span class="material-symbols-outlined">person</span></div>
                                    <h4 class="section-title">Dados do Cliente</h4>
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
                                    <div>
                                        <label class="text-[10px] font-black text-slate-400 uppercase mb-1 block">Nome / Prospect</label>
                                        <input type="text" id="q-customer" placeholder="Ex: João Silva" list="customers-list" class="w-full">
                                        <datalist id="customers-list">
                                            ${customers.map(c => `<option value="${c.name}">`).join('')}
                                        </datalist>
                                    </div>
                                    <div>
                                        <label class="text-[10px] font-black text-slate-400 uppercase mb-1 block">WhatsApp</label>
                                        <input type="text" id="q-whatsapp" placeholder="(00) 00000-0000" class="w-full">
                                    </div>
                                </div>
                            </div>

                            <!-- 2. Itens do Pedido -->
                            <div class="flex flex-col gap-4">
                                <div class="flex justify-between items-center">
                                    <h4 class="text-sm font-black text-slate-800 uppercase tracking-widest">Itens do Pedido</h4>
                                    <div class="flex gap-2">
                                        <button onclick="window.addItem('avulso')" class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-sm">
                                            <span class="material-symbols-outlined !text-[16px]">post_add</span>
                                            + ITEM AVULSO / SERVIÇO
                                        </button>
                                        <button onclick="window.addItem('catalogo')" class="px-3 py-1.5 rounded-lg bg-indigo-600 text-[10px] font-black text-white hover:bg-indigo-700 transition-all flex items-center gap-1.5 shadow-md shadow-indigo-100">
                                            <span class="material-symbols-outlined !text-[16px]">add_shopping_cart</span>
                                            + PRODUTO DO CATÁLOGO
                                        </button>
                                    </div>
                                </div>

                                <!-- Lista de Itens Adicionados -->
                                <div id="items-list-container" class="space-y-4">
                                    <!-- Itens injetados aqui -->
                                    <div class="p-12 text-center border-2 border-dashed rounded-3xl border-slate-200 flex flex-col items-center gap-3">
                                        <span class="material-symbols-outlined text-4xl text-slate-200">add_shopping_cart</span>
                                        <p class="text-sm font-bold text-slate-400 italic">Nenhum item adicionado ao orçamento.</p>
                                    </div>
                                </div>
                            </div>

                            <!-- 3. Taxas e Observações Gerais -->
                            <div class="section-card">
                                <h4 class="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Extras e Taxas</h4>
                                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label class="text-[10px] font-black text-slate-400 uppercase mb-1 block">Frete (R$)</label>
                                        <input type="number" id="q-shipping" value="0" step="0.01" class="w-full">
                                    </div>
                                    <div>
                                        <label class="text-[10px] font-black text-slate-400 uppercase mb-1 block">Instalação (R$)</label>
                                        <input type="number" id="q-install" value="0" step="0.01" class="w-full">
                                    </div>
                                    <div>
                                        <label class="text-[10px] font-black text-slate-400 uppercase mb-1 block">Urgência (R$)</label>
                                        <input type="number" id="q-urgency" value="0" step="0.01" class="w-full">
                                    </div>
                                    <div>
                                        <label class="text-[10px] font-black text-slate-400 uppercase mb-1 block">Desconto (R$)</label>
                                        <input type="number" id="q-discount" value="0" step="0.01" class="w-full">
                                    </div>
                                </div>
                                <div class="mt-6">
                                    <label class="text-[10px] font-black text-slate-400 uppercase mb-1 block">Observações Gerais do Pedido</label>
                                    <textarea id="q-obs" rows="3" class="w-full resize-none" placeholder="Ex: Pagamento 50% entrada e 50% na entrega..."></textarea>
                                </div>
                            </div>
                        </div>

                        <!-- RIGHT: Summary (35%) -->
                        <div class="w-[350px] bg-white border-l border-slate-200 flex flex-col">
                            <div class="p-8 flex-1 overflow-y-auto">
                                <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Resumo da Proposta</h4>
                                
                                <div id="summary-items-list" class="space-y-4 mb-8">
                                    <!-- Mini lista de itens -->
                                </div>

                                <div class="space-y-3 pt-6 border-t border-dashed border-slate-200">
                                    <div class="flex justify-between items-center text-xs font-bold text-slate-500">
                                        <span>Subtotal Itens</span>
                                        <span id="summ-subtotal">R$ 0,00</span>
                                    </div>
                                    <div class="flex justify-between items-center text-xs font-bold text-emerald-600">
                                        <span>Taxas Extras</span>
                                        <span id="summ-extras">R$ 0,00</span>
                                    </div>
                                    <div class="flex justify-between items-center text-xs font-bold text-amber-600">
                                        <span>Descontos</span>
                                        <span id="summ-discount">- R$ 0,00</span>
                                    </div>
                                    <div class="pt-6 mt-6 border-t border-slate-100 text-center">
                                        <p class="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Total Final do Pedido</p>
                                        <p id="summ-total" class="text-4xl font-black text-slate-800 tracking-tighter">R$ 0,00</p>
                                        <p class="text-[10px] text-slate-400 font-bold mt-2 uppercase">Proposta válida por 15 dias</p>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Actions Footer -->
                            <div class="p-6 bg-slate-50 border-t border-slate-200 space-y-3">
                                <button id="btn-save-quote" class="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                                    <span class="material-symbols-outlined">save</span>
                                    SALVAR E GERAR
                                </button>
                                <button id="btn-share-whatsapp" class="w-full py-3 bg-white border border-slate-200 text-emerald-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-50 transition-all flex items-center justify-center gap-2">
                                    <span class="material-symbols-outlined !text-[18px]">share</span>
                                    Enviar via WhatsApp
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SUB-MODAL: ADICIONAR ITEM (CATÁLOGO OU AVULSO) -->
            <div id="item-modal" class="modal-overlay hidden" style="z-index: 100;">
                <div class="modal-container max-w-[800px]">
                    <div class="px-8 py-6 border-b flex justify-between items-center bg-white">
                        <h3 id="item-modal-title" class="text-lg font-black text-slate-800">Adicionar Item</h3>
                        <button id="close-item-modal" class="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    
                    <div id="item-modal-body" class="p-8 overflow-y-auto max-h-[70vh]">
                        <!-- Injetado dinamicamente -->
                    </div>

                    <div class="px-8 py-6 border-t bg-slate-50 flex justify-end gap-3 rounded-b-3xl">
                        <button id="btn-cancel-item" class="btn-ghost">Cancelar</button>
                        <button id="btn-confirm-item" class="btn-primary">Confirmar Item</button>
                    </div>
                </div>
            </div>
        `;

        Quotes.initEvents(container);
    },

    initEvents: (container) => {
        const modal = document.getElementById('quote-modal');
        const itemModal = document.getElementById('item-modal');
        
        // Reset carrinho
        Quotes.currentItems = [];

        // --- HANDLERS GLOBAIS ---
        
        window.addItem = (type) => {
            const body = document.getElementById('item-modal-body');
            const title = document.getElementById('item-modal-title');
            
            if (type === 'avulso') {
                title.innerText = 'Adicionar Item Avulso / Serviço';
                body.innerHTML = `
                    <div class="grid grid-cols-1 gap-5">
                        <div>
                            <label class="text-[10px] font-black text-slate-400 uppercase mb-1 block">Nome do Serviço / Produto</label>
                            <input type="text" id="ai-name" class="w-full" placeholder="Ex: Arte para Redes Sociais">
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-[10px] font-black text-slate-400 uppercase mb-1 block">Quantidade</label>
                                <input type="number" id="ai-qty" value="1" min="1" class="w-full">
                            </div>
                            <div>
                                <label class="text-[10px] font-black text-slate-400 uppercase mb-1 block">Valor Unitário (R$)</label>
                                <input type="number" id="ai-price" value="0" step="0.01" class="w-full">
                            </div>
                        </div>
                        <div>
                            <label class="text-[10px] font-black text-slate-400 uppercase mb-1 block">Observação do Item</label>
                            <textarea id="ai-obs" rows="2" class="w-full resize-none" placeholder="Detalhes específicos deste item..."></textarea>
                        </div>
                    </div>
                `;
            } else {
                title.innerText = 'Selecionar Produto do Catálogo';
                const products = DB.get('products') || [];
                body.innerHTML = `
                    <div class="flex flex-col gap-6">
                        <div>
                            <label class="text-[10px] font-black text-slate-400 uppercase mb-1 block">Pesquisar Produto</label>
                            <input type="text" id="ai-product-search" class="w-full mb-4" placeholder="Digite o nome do produto..." list="p-list-ai">
                            <datalist id="p-list-ai">
                                ${products.map(p => `<option value="${p.name}">`).join('')}
                            </datalist>
                        </div>
                        <div id="ai-configurator-area" class="space-y-4">
                            <!-- Injetado ao selecionar produto -->
                            <div class="p-12 text-center border-2 border-dashed rounded-3xl border-slate-200">
                                <p class="text-sm font-bold text-slate-300 italic">Selecione um produto para configurar.</p>
                            </div>
                        </div>
                    </div>
                `;
                
                // Listener de busca de produto no catálogo
                const search = document.getElementById('ai-product-search');
                search.addEventListener('input', (e) => {
                    const p = products.find(item => item.name === e.target.value);
                    if (p) Quotes.renderConfigurator(p);
                });
            }
            
            itemModal.classList.remove('hidden');
            
            document.getElementById('btn-confirm-item').onclick = () => {
                if (type === 'avulso') {
                    const name = document.getElementById('ai-name').value;
                    const qty = parseFloat(document.getElementById('ai-qty').value) || 1;
                    const price = parseFloat(document.getElementById('ai-price').value) || 0;
                    if (!name) return;
                    
                    Quotes.currentItems.push({
                        id: Math.random().toString(36).substr(2, 5).toUpperCase(),
                        name,
                        qty,
                        unitPrice: price,
                        total: qty * price,
                        type: 'avulso',
                        options: [],
                        obs: document.getElementById('ai-obs').value
                    });
                } else {
                    // Lógica para item de catálogo (pegar do configurador)
                    const pName = document.getElementById('ai-product-search').value;
                    const product = DB.get('products').find(p => p.name === pName);
                    if (!product) return;

                    let extras = 0;
                    const options = [];
                    document.querySelectorAll('.config-card.card-active').forEach(card => {
                        extras += parseFloat(card.dataset.cost || 0);
                        options.push(card.querySelector('.config-card-label').innerText);
                    });

                    // Tenta achar a quantidade nas variações
                    let qty = 1;
                    const qtyCard = document.querySelector('.config-group:has(.config-group-title:contains("QUANTIDADE")) .card-active');
                    // Como contains é jQuery, usamos fallback manual
                    const groups = Array.from(document.querySelectorAll('.config-group'));
                    const qGroup = groups.find(g => g.innerText.includes('QUANTIDADE'));
                    const qVal = qGroup?.querySelector('.card-active .config-card-label')?.innerText;
                    if (qVal) qty = parseInt(qVal.replace(/\D/g, '')) || 1;

                    const total = product.price + extras;

                    Quotes.currentItems.push({
                        id: Math.random().toString(36).substr(2, 5).toUpperCase(),
                        name: product.name,
                        qty: qty,
                        unitPrice: total / qty,
                        total: total,
                        type: 'catalogo',
                        options: options,
                        image: product.image
                    });
                }
                
                itemModal.classList.add('hidden');
                Quotes.updateItemsUI();
            };
        };

        window.removeItem = (idx) => {
            Quotes.currentItems.splice(idx, 1);
            Quotes.updateItemsUI();
        };

        window.duplicateItem = (idx) => {
            const item = { ...Quotes.currentItems[idx], id: Math.random().toString(36).substr(2, 5).toUpperCase() };
            Quotes.currentItems.splice(idx + 1, 0, item);
            Quotes.updateItemsUI();
        };

        // --- UI UPDATERS ---
        
        Quotes.updateItemsUI = () => {
            const container = document.getElementById('items-list-container');
            const summary = document.getElementById('summary-items-list');
            const fmtBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            if (Quotes.currentItems.length === 0) {
                container.innerHTML = `<div class="p-12 text-center border-2 border-dashed rounded-3xl border-slate-200 flex flex-col items-center gap-3">
                    <span class="material-symbols-outlined text-4xl text-slate-200">add_shopping_cart</span>
                    <p class="text-sm font-bold text-slate-400 italic">Nenhum item adicionado ao orçamento.</p>
                </div>`;
                summary.innerHTML = '';
            } else {
                container.innerHTML = Quotes.currentItems.map((it, idx) => `
                    <div class="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col md:flex-row items-center gap-6 group hover:shadow-lg hover:shadow-indigo-50 transition-all">
                        <div class="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                            ${it.image ? `<img src="${it.image}" class="w-full h-full object-cover">` : `<span class="material-symbols-outlined text-slate-300 text-3xl">${it.type === 'avulso' ? 'design_services' : 'package_2'}</span>`}
                        </div>
                        <div class="flex-1">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h5 class="text-sm font-black text-slate-800 uppercase tracking-tight">${it.name}</h5>
                                    <p class="text-[10px] font-bold text-slate-400">${it.qty} un • ${fmtBRL(it.unitPrice)} cada</p>
                                </div>
                                <p class="text-lg font-black text-slate-800">${fmtBRL(it.total)}</p>
                            </div>
                            <div class="flex flex-wrap gap-1 mt-3">
                                ${it.options.map(opt => `<span class="px-2 py-0.5 rounded-md bg-indigo-50 text-[10px] font-black text-primary uppercase">${opt}</span>`).join('')}
                            </div>
                        </div>
                        <div class="flex gap-2 border-l pl-6 border-slate-100">
                            <button onclick="window.duplicateItem(${idx})" class="p-2 text-slate-300 hover:text-indigo-600 transition-all"><span class="material-symbols-outlined !text-[20px]">content_copy</span></button>
                            <button onclick="window.removeItem(${idx})" class="p-2 text-slate-300 hover:text-red-500 transition-all"><span class="material-symbols-outlined !text-[20px]">delete</span></button>
                        </div>
                    </div>
                `).join('');
                
                summary.innerHTML = Quotes.currentItems.map(it => `
                    <div class="flex justify-between items-center">
                        <div class="max-w-[70%]">
                            <p class="text-[10px] font-black text-slate-800 uppercase truncate">${it.name}</p>
                            <p class="text-[9px] font-bold text-slate-400">${it.qty} un</p>
                        </div>
                        <span class="text-xs font-black text-slate-700">${fmtBRL(it.total)}</span>
                    </div>
                `).join('');
            }
            
            Quotes.calculateFinalTotal();
        };

        Quotes.calculateFinalTotal = () => {
            const subtotal = Quotes.currentItems.reduce((acc, it) => acc + it.total, 0);
            const shipping = parseFloat(document.getElementById('q-shipping')?.value) || 0;
            const install  = parseFloat(document.getElementById('q-install')?.value) || 0;
            const urgency  = parseFloat(document.getElementById('q-urgency')?.value) || 0;
            const discount = parseFloat(document.getElementById('q-discount')?.value) || 0;
            
            const extras = shipping + install + urgency;
            const total = subtotal + extras - discount;
            
            const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const set = (id, txt) => { const el = document.getElementById(id); if (el) el.innerText = txt; };
            
            set('summ-subtotal', fmt(subtotal));
            set('summ-extras', `+ ${fmt(extras)}`);
            set('summ-discount', `- ${fmt(discount)}`);
            set('summ-total', fmt(total));
        };

        Quotes.renderConfigurator = (p) => {
            const area = document.getElementById('ai-configurator-area');
            const variationsHtml = p.variations && p.variations.length > 0 
                ? p.variations.map(group => {
                    const isQty = group.name.toUpperCase().includes('QUANTIDADE');
                    return `
                        <div class="config-group">
                            <div class="config-group-title text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <span class="material-symbols-outlined !text-sm">${isQty ? 'format_list_numbered' : 'settings'}</span>
                                ${group.name}
                            </div>
                            <div class="config-grid ${isQty ? 'config-grid-qty' : 'grid grid-cols-2 md:grid-cols-3 gap-2'}">
                                ${group.options.map(opt => `
                                    <div class="config-card ${isQty ? 'config-card-qty' : 'p-3 border rounded-xl cursor-pointer hover:border-primary transition-all'} flex flex-col gap-1" data-cost="${opt.price}">
                                        <input type="radio" name="conf-${group.name.replace(/\s/g, '-')}" class="hidden">
                                        <span class="config-card-label text-[10px] font-black uppercase text-slate-700">${opt.name}</span>
                                        <span class="config-card-price text-[9px] font-bold text-slate-400">+ R$ ${opt.price.toFixed(2)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }).join('')
                : `<div class="p-8 text-center border-2 border-dashed rounded-3xl border-slate-100">
                    <p class="text-sm font-bold text-slate-300 italic">Este produto não possui configurações avançadas.</p>
                  </div>`;

            area.innerHTML = `
                <div class="p-4 rounded-2xl bg-white border border-slate-100 flex items-center gap-4 mb-6">
                    <div class="w-16 h-16 rounded-xl overflow-hidden bg-slate-50 border flex-shrink-0">
                        <img src="${p.image || 'https://via.placeholder.com/200'}" class="w-full h-full object-cover">
                    </div>
                    <div>
                        <h4 class="text-md font-black text-slate-800">${p.name}</h4>
                        <span class="badge badge-purple">${p.category}</span>
                    </div>
                </div>
                ${variationsHtml}
            `;
            
            // Configurator card selection logic
            area.querySelectorAll('.config-card').forEach(card => {
                card.onclick = () => {
                    const group = card.closest('.config-group');
                    group.querySelectorAll('.config-card').forEach(c => c.classList.remove('card-active', 'border-primary', 'bg-indigo-50/30'));
                    card.classList.add('card-active', 'border-primary', 'bg-indigo-50/30');
                    card.querySelector('input').checked = true;
                };
            });
        };

        // --- MODAL CONTROLS ---
        
        const openModal = () => { 
            modal.classList.remove('hidden'); 
            Quotes.currentItems = []; 
            Quotes.updateItemsUI();
        };
        const closeModal = () => modal.classList.add('hidden');
        
        document.getElementById('btn-add-quote')?.addEventListener('click', openModal);
        document.getElementById('btn-add-quote-empty')?.addEventListener('click', openModal);
        document.getElementById('close-quote-modal')?.addEventListener('click', closeModal);
        document.getElementById('close-item-modal')?.addEventListener('click', () => itemModal.classList.add('hidden'));
        document.getElementById('btn-cancel-item')?.addEventListener('click', () => itemModal.classList.add('hidden'));

        // Watch summary inputs
        ['q-shipping', 'q-install', 'q-urgency', 'q-discount'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', Quotes.calculateFinalTotal);
        });

        // --- FINAL SAVE ---
        
        document.getElementById('btn-save-quote').onclick = () => {
            if (Quotes.currentItems.length === 0) {
                import('../app.js').then(m => m.default.toast('Adicione pelo menos um item!', 'warning'));
                return;
            }
            
            const customerName = document.getElementById('q-customer').value;
            if (!customerName) {
                import('../app.js').then(m => m.default.toast('Selecione um cliente!', 'warning'));
                return;
            }

            const subtotal = Quotes.currentItems.reduce((acc, it) => acc + it.total, 0);
            const shipping = parseFloat(document.getElementById('q-shipping').value) || 0;
            const install  = parseFloat(document.getElementById('q-install').value) || 0;
            const urgency  = parseFloat(document.getElementById('q-urgency').value) || 0;
            const discount = parseFloat(document.getElementById('q-discount').value) || 0;
            const total = subtotal + shipping + install + urgency - discount;

            const newQuote = {
                id: `ORC-${Math.floor(1000 + Math.random() * 9000)}`,
                date: new Date().toLocaleDateString('pt-BR'),
                customerName,
                whatsapp: document.getElementById('q-whatsapp').value,
                items: [...Quotes.currentItems],
                shipping,
                install,
                urgency,
                discount,
                value: total,
                status: 'Pendente',
                obs: document.getElementById('q-obs').value
            };

            const quotes = DB.get('quotes') || [];
            quotes.unshift(newQuote);
            DB.save('quotes', quotes);

            import('../app.js').then(m => m.default.toast('Orçamento salvo com sucesso!', 'success'));
            closeModal();
            Quotes.render(container);
        };

        // --- WHATSAPP SHARING ---
        
        window.shareQuote = (id) => {
            const quotes = DB.get('quotes') || [];
            const q = quotes.find(item => item.id === id);
            if (!q) return;

            const fmt = (v) => parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            
            let msg = `*ORÇAMENTO - ${q.id}* 📄✨\n`;
            msg += `------------------------------\n`;
            msg += `*Cliente:* ${q.customerName}\n\n`;
            
            q.items.forEach((it, idx) => {
                msg += `*${idx + 1}. ${it.name}*\n`;
                msg += `Qtd: ${it.qty} un\n`;
                if (it.options && it.options.length > 0) msg += `Config: ${it.options.join(', ')}\n`;
                msg += `Subtotal: ${fmt(it.total)}\n\n`;
            });

            if (q.shipping > 0)  msg += `*Frete:* ${fmt(q.shipping)}\n`;
            if (q.install > 0)   msg += `*Instalação:* ${fmt(q.install)}\n`;
            if (q.urgency > 0)   msg += `*Taxa de Urgência:* ${fmt(q.urgency)}\n`;
            if (q.discount > 0)  msg += `*Desconto:* - ${fmt(q.discount)}\n`;

            msg += `------------------------------\n`;
            msg += `*VALOR TOTAL:* ${fmt(q.value)}\n`;
            msg += `*PRAZO:* 3 a 5 dias úteis\n`;
            msg += `------------------------------\n`;
            msg += `_Gerado por Gestor Gráfico Pro_`;

            const phone = q.whatsapp ? q.whatsapp.replace(/\D/g, '') : '';
            const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`;
            window.open(url, '_blank');
        };

        // --- CONVERT TO SALE ---
        
        window.convertToSale = (id) => {
            import('../app.js').then(m => {
                m.default.confirm({
                    title: 'Aprovar Orçamento?',
                    message: 'Isso criará os pedidos de produção no Kanban e registrará a venda no financeiro.',
                    confirmLabel: 'Aprovar agora',
                    onConfirm: () => {
                        const quotes = DB.get('quotes') || [];
                        const qIdx = quotes.findIndex(q => q.id === id);
                        if (qIdx === -1) return;

                        const q = quotes[qIdx];
                        q.status = 'Aprovado';
                        DB.save('quotes', quotes);

                        // Criar pedidos no Kanban (um para cada item do orçamento)
                        const orders = DB.get('orders') || [];
                        q.items.forEach(it => {
                            orders.unshift({
                                id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
                                date: new Date().toLocaleDateString('pt-BR'),
                                customerName: q.customerName,
                                productName: it.name,
                                value: it.total,
                                status: 'Aguardando Arte',
                                options: it.options
                            });
                        });
                        DB.save('orders', orders);

                        m.default.toast('Venda registrada e enviada para produção!', 'success');
                        Quotes.render(container);
                    }
                });
            });
        };
    }
};

export default Quotes;
