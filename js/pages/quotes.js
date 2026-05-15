import DB from '../db.js';

const Quotes = {
    currentItems: [], 
    
    render: (container) => {
        const quotes = DB.get('quotes') || [];
        const customers = DB.get('customers') || [];
        const fmtBRL = (v) => parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        container.innerHTML = `
            <div class="max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                <!-- Top Header -->
                <div class="flex justify-between items-center mb-8">
                    <div>
                        <h2 class="text-3xl font-black text-slate-800 tracking-tight">Orçamentos</h2>
                        <p class="text-slate-500 font-medium">Gerencie suas propostas comerciais com facilidade.</p>
                    </div>
                    <button id="btn-add-quote" class="btn-primary shadow-xl shadow-indigo-100 px-8 py-4">
                        <span class="material-symbols-outlined">add_task</span>
                        Novo Orçamento
                    </button>
                </div>

                <!-- Listagem Estilo Card -->
                <div class="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b">
                                <th class="px-8 py-5">Identificação</th>
                                <th class="px-8 py-5">Cliente</th>
                                <th class="px-8 py-5">Resumo do Pedido</th>
                                <th class="px-8 py-5 text-right">Total</th>
                                <th class="px-8 py-5 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${quotes.length === 0 ? `
                                <tr>
                                    <td colspan="5" class="px-8 py-32 text-center">
                                        <div class="opacity-20 flex flex-col items-center gap-3">
                                            <span class="material-symbols-outlined text-6xl">receipt_long</span>
                                            <p class="text-xl font-bold italic">Nenhum orçamento ainda...</p>
                                        </div>
                                    </td>
                                </tr>
                            ` : quotes.map(q => `
                                <tr class="hover:bg-slate-50/80 transition-all group">
                                    <td class="px-8 py-6">
                                        <p class="text-sm font-black text-primary">${q.id}</p>
                                        <p class="text-[10px] font-bold text-slate-400 uppercase">${q.date}</p>
                                    </td>
                                    <td class="px-8 py-6">
                                        <p class="text-sm font-black text-slate-700">${q.customerName}</p>
                                        <span class="badge ${q.status === 'Aprovado' ? 'badge-green' : 'badge-purple'}">${q.status}</span>
                                    </td>
                                    <td class="px-8 py-6">
                                        <p class="text-xs font-bold text-slate-500 truncate max-w-[300px]">
                                            ${(q.items || []).map(it => `${it.qty}x ${it.name}`).join(' + ')}
                                        </p>
                                    </td>
                                    <td class="px-8 py-6 text-right font-black text-slate-800 text-lg">
                                        ${fmtBRL(q.value)}
                                    </td>
                                    <td class="px-8 py-6">
                                        <div class="flex justify-center gap-2">
                                            <button onclick="window.shareQuote('${q.id}')" class="w-10 h-10 flex items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all"><span class="material-symbols-outlined text-xl">share</span></button>
                                            <button onclick="window.convertToSale('${q.id}')" class="w-10 h-10 flex items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all"><span class="material-symbols-outlined text-xl">check</span></button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- O POP-UP QUE VOCÊ GOSTA -->
            <div id="quote-modal" class="modal-overlay hidden">
                <div class="modal-container max-w-[1200px] h-[90vh] flex flex-col">
                    
                    <!-- Header -->
                    <div class="px-8 py-6 border-b flex justify-between items-center bg-white sticky top-0 z-10">
                        <div>
                            <h3 class="text-2xl font-black text-slate-800">Novo Orçamento Profissional</h3>
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Gere propostas de alto nível em segundos</p>
                        </div>
                        <button id="close-quote-modal" class="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-all">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <!-- Conteúdo Principal -->
                    <div class="flex-1 flex overflow-hidden bg-slate-50">
                        
                        <!-- Coluna Formulário -->
                        <div class="flex-1 overflow-y-auto p-8 space-y-8">
                            
                            <!-- Card Cliente -->
                            <div class="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                                <div class="flex items-center gap-3 mb-6">
                                    <div class="w-10 h-10 rounded-xl bg-indigo-50 text-primary flex items-center justify-center"><span class="material-symbols-outlined">person</span></div>
                                    <h4 class="text-sm font-black text-slate-800 uppercase tracking-widest">Informações do Cliente</h4>
                                </div>
                                <div class="grid grid-cols-2 gap-6">
                                    <div>
                                        <label class="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Nome do Cliente</label>
                                        <input type="text" id="q-customer" placeholder="Busque ou digite o nome..." list="customers-list" class="w-full">
                                    </div>
                                    <div>
                                        <label class="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">WhatsApp</label>
                                        <input type="text" id="q-whatsapp" placeholder="(00) 00000-0000" class="w-full">
                                    </div>
                                </div>
                            </div>

                            <!-- Área de Itens (Onde a mágica acontece) -->
                            <div class="space-y-4">
                                <div class="flex justify-between items-center px-4">
                                    <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest">Produtos / Serviços</h4>
                                    <div class="flex gap-2">
                                        <button onclick="window.addItem('avulso')" class="px-4 py-2 rounded-xl bg-white border border-slate-200 text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2">
                                            <span class="material-symbols-outlined !text-sm">post_add</span> + SERVIÇO AVULSO
                                        </button>
                                        <button onclick="window.addItem('catalogo')" class="px-4 py-2 rounded-xl bg-indigo-600 text-[10px] font-black text-white hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100">
                                            <span class="material-symbols-outlined !text-sm">add_shopping_cart</span> + PRODUTO CATÁLOGO
                                        </button>
                                    </div>
                                </div>

                                <div id="items-list-container" class="space-y-4">
                                    <!-- Itens injetados aqui -->
                                </div>
                            </div>

                            <!-- Taxas Finais -->
                            <div class="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                                <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Taxas Extras e Observações</h4>
                                <div class="grid grid-cols-4 gap-4">
                                    <div>
                                        <label class="text-[10px] font-black text-slate-400 uppercase mb-1 block">Frete</label>
                                        <input type="number" id="q-shipping" value="0" class="w-full">
                                    </div>
                                    <div>
                                        <label class="text-[10px] font-black text-slate-400 uppercase mb-1 block">Instalação</label>
                                        <input type="number" id="q-install" value="0" class="w-full">
                                    </div>
                                    <div>
                                        <label class="text-[10px] font-black text-slate-400 uppercase mb-1 block">Urgência</label>
                                        <input type="number" id="q-urgency" value="0" class="w-full">
                                    </div>
                                    <div>
                                        <label class="text-[10px] font-black text-slate-400 uppercase mb-1 block">Desconto</label>
                                        <input type="number" id="q-discount" value="0" class="w-full">
                                    </div>
                                </div>
                                <textarea id="q-obs" rows="2" class="w-full mt-6" placeholder="Observações que sairão no orçamento..."></textarea>
                            </div>
                        </div>

                        <!-- Coluna Resumo (Sidebar) -->
                        <div class="w-[380px] bg-white border-l border-slate-200 flex flex-col p-8">
                            <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-8">Resumo do Pedido</h4>
                            
                            <div id="summary-items-list" class="flex-1 space-y-4 overflow-y-auto">
                                <!-- Mini listagem de itens -->
                            </div>

                            <div class="pt-8 border-t border-slate-100 space-y-3">
                                <div class="flex justify-between items-center text-xs font-bold text-slate-400">
                                    <span>Subtotal Itens</span>
                                    <span id="summ-subtotal">R$ 0,00</span>
                                </div>
                                <div class="flex justify-between items-center text-xs font-bold text-indigo-600">
                                    <span>Taxas Extras</span>
                                    <span id="summ-extras">R$ 0,00</span>
                                </div>
                                <div class="flex justify-between items-center text-xs font-bold text-amber-600">
                                    <span>Descontos</span>
                                    <span id="summ-discount">- R$ 0,00</span>
                                </div>
                                
                                <div class="pt-8 mt-4 border-t-2 border-slate-800 text-center">
                                    <p class="text-[10px] font-black text-primary uppercase mb-1">Total da Proposta</p>
                                    <p id="summ-total" class="text-5xl font-black text-slate-800 tracking-tighter">R$ 0,00</p>
                                </div>

                                <div class="pt-8 space-y-3">
                                    <button id="btn-save-quote" class="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-sm shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                                        <span class="material-symbols-outlined">save</span> SALVAR ORÇAMENTO
                                    </button>
                                    <button id="btn-share-whatsapp" class="w-full py-4 bg-white border-2 border-slate-100 text-emerald-600 rounded-[20px] font-black text-[10px] uppercase tracking-widest hover:bg-emerald-50 transition-all flex items-center justify-center gap-2">
                                        <span class="material-symbols-outlined">share</span> Enviar WhatsApp
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SUB-MODAL DE ADIÇÃO (Configurador) -->
            <div id="item-modal" class="modal-overlay hidden" style="z-index: 100;">
                <div class="modal-container max-w-[800px] max-h-[85vh] flex flex-col">
                    <div class="p-8 border-b flex justify-between items-center bg-white">
                        <h3 id="item-modal-title" class="text-xl font-black text-slate-800">Configurar Item</h3>
                        <button id="close-item-modal" class="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-all">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div id="item-modal-body" class="p-8 overflow-y-auto bg-slate-50">
                        <!-- Conteúdo dinâmico -->
                    </div>
                    <div class="p-8 border-t bg-white flex justify-end gap-3">
                        <button id="btn-cancel-item" class="btn-ghost">Cancelar</button>
                        <button id="btn-confirm-item" class="btn-primary px-8">Confirmar e Adicionar</button>
                    </div>
                </div>
            </div>
        `;

        Quotes.initEvents(container);
    },

    initEvents: (container) => {
        const modal = document.getElementById('quote-modal');
        const itemModal = document.getElementById('item-modal');
        
        // --- LOGICA DE ITENS ---
        
        window.addItem = (type) => {
            const body = document.getElementById('item-modal-body');
            const title = document.getElementById('item-modal-title');
            
            if (type === 'avulso') {
                title.innerText = 'Serviço Avulso / Extra';
                body.innerHTML = `
                    <div class="space-y-6">
                        <div>
                            <label class="text-[10px] font-black text-slate-400 uppercase mb-2 block">Nome do Serviço</label>
                            <input type="text" id="ai-name" class="w-full text-lg font-bold" placeholder="Ex: Arte para Instagram / Instalação">
                        </div>
                        <div class="grid grid-cols-2 gap-6">
                            <div>
                                <label class="text-[10px] font-black text-slate-400 uppercase mb-2 block">Quantidade</label>
                                <input type="number" id="ai-qty" value="1" class="w-full">
                            </div>
                            <div>
                                <label class="text-[10px] font-black text-slate-400 uppercase mb-2 block">Valor Unitário (R$)</label>
                                <input type="number" id="ai-price" value="0" step="0.01" class="w-full">
                            </div>
                        </div>
                    </div>
                `;
            } else {
                title.innerText = 'Produto do Catálogo';
                const products = DB.get('products') || [];
                body.innerHTML = `
                    <div class="space-y-6">
                        <div>
                            <label class="text-[10px] font-black text-slate-400 uppercase mb-2 block">Escolher Produto</label>
                            <input type="text" id="ai-product-search" class="w-full mb-6" placeholder="Busque pelo nome..." list="p-list-ai">
                            <datalist id="p-list-ai">${products.map(p => `<option value="${p.name}">`).join('')}</datalist>
                        </div>
                        <div id="ai-configurator-area" class="space-y-6">
                            <div class="p-20 text-center border-2 border-dashed rounded-[32px] border-slate-200 opacity-30 flex flex-col items-center gap-3">
                                <span class="material-symbols-outlined text-5xl text-slate-400">search_check</span>
                                <p class="text-sm font-bold italic">Selecione o produto acima para configurar as variações.</p>
                            </div>
                        </div>
                    </div>
                `;
                
                const search = document.getElementById('ai-product-search');
                search.addEventListener('input', (e) => {
                    const p = products.find(item => item.name === e.target.value);
                    if (p) Quotes.renderConfigurator(p);
                });
            }
            
            itemModal.classList.remove('hidden');
            
            document.getElementById('btn-confirm-item').onclick = () => {
                let newItem = null;
                if (type === 'avulso') {
                    const name = document.getElementById('ai-name').value;
                    const qty = parseFloat(document.getElementById('ai-qty').value) || 1;
                    const price = parseFloat(document.getElementById('ai-price').value) || 0;
                    if (!name) return;
                    newItem = { id: Math.random().toString(36).substr(2, 5).toUpperCase(), name, qty, unitPrice: price, total: qty * price, type: 'avulso', options: [] };
                } else {
                    const pName = document.getElementById('ai-product-search').value;
                    const p = DB.get('products').find(p => p.name === pName);
                    if (!p) return;
                    let extras = 0;
                    const opts = [];
                    document.querySelectorAll('.config-card.card-active').forEach(c => {
                        extras += parseFloat(c.dataset.cost || 0);
                        opts.push(c.querySelector('.config-card-label').innerText);
                    });
                    
                    // Achar Qty nas variações
                    let qty = 1;
                    const qGroup = Array.from(document.querySelectorAll('.config-group')).find(g => g.innerText.includes('QUANTIDADE'));
                    const qVal = qGroup?.querySelector('.card-active .config-card-label')?.innerText;
                    if (qVal) qty = parseInt(qVal.replace(/\D/g, '')) || 1;
                    
                    newItem = { id: Math.random().toString(36).substr(2, 5).toUpperCase(), name: p.name, qty, unitPrice: (p.price + extras) / qty, total: p.price + extras, type: 'catalogo', options: opts, image: p.image };
                }
                
                if (newItem) {
                    Quotes.currentItems.push(newItem);
                    itemModal.classList.add('hidden');
                    Quotes.updateItemsUI();
                }
            };
        };

        window.removeItem = (idx) => {
            Quotes.currentItems.splice(idx, 1);
            Quotes.updateItemsUI();
        };

        Quotes.updateItemsUI = () => {
            const container = document.getElementById('items-list-container');
            const summary = document.getElementById('summary-items-list');
            const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            if (Quotes.currentItems.length === 0) {
                container.innerHTML = `<div class="p-16 text-center border-2 border-dashed rounded-[40px] border-slate-200 opacity-40">
                    <p class="text-sm font-bold italic text-slate-400">Nenhum item adicionado ao pedido.</p>
                </div>`;
                summary.innerHTML = '';
            } else {
                container.innerHTML = Quotes.currentItems.map((it, idx) => `
                    <div class="bg-white p-6 rounded-[32px] border border-slate-200 flex items-center gap-6 group hover:shadow-xl hover:shadow-indigo-50/50 transition-all border-l-8 ${it.type === 'avulso' ? 'border-l-amber-400' : 'border-l-primary'} animate-in slide-in-from-right-4 duration-300">
                        <div class="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                            ${it.image ? `<img src="${it.image}" class="w-full h-full object-cover">` : `<span class="material-symbols-outlined text-slate-300 text-3xl">${it.type === 'avulso' ? 'design_services' : 'package_2'}</span>`}
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex justify-between items-center mb-2">
                                <h5 class="text-sm font-black text-slate-800 truncate uppercase tracking-tight">${it.name}</h5>
                                <p class="text-md font-black text-slate-800">${fmt(it.total)}</p>
                            </div>
                            <div class="flex flex-wrap gap-1.5">
                                <span class="px-2 py-0.5 rounded-lg bg-slate-100 text-[9px] font-bold text-slate-500 uppercase">${it.qty} unidades</span>
                                ${it.options.map(o => `<span class="px-2 py-0.5 rounded-lg bg-indigo-50 text-[9px] font-black text-primary uppercase">${o}</span>`).join('')}
                            </div>
                        </div>
                        <button onclick="window.removeItem(${idx})" class="w-10 h-10 flex items-center justify-center rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                            <span class="material-symbols-outlined !text-[20px]">delete</span>
                        </button>
                    </div>
                `).join('');
                
                summary.innerHTML = Quotes.currentItems.map(it => `
                    <div class="flex justify-between items-center animate-in fade-in duration-300">
                        <div class="max-w-[70%]">
                            <p class="text-[10px] font-black text-slate-800 uppercase truncate">${it.name}</p>
                            <p class="text-[9px] font-bold text-slate-400 tracking-widest">${it.qty} UN</p>
                        </div>
                        <span class="text-[11px] font-black text-slate-700">${fmt(it.total)}</span>
                    </div>
                `).join('');
            }
            Quotes.calculateFinalTotal();
        };

        Quotes.calculateFinalTotal = () => {
            const subtotal = Quotes.currentItems.reduce((acc, it) => acc + it.total, 0);
            const extras = (parseFloat(document.getElementById('q-shipping')?.value) || 0) + 
                           (parseFloat(document.getElementById('q-install')?.value) || 0) + 
                           (parseFloat(document.getElementById('q-urgency')?.value) || 0);
            const discount = parseFloat(document.getElementById('q-discount')?.value) || 0;
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
                            <div class="config-group-title text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] mb-3 flex items-center gap-2">
                                <span class="material-symbols-outlined !text-sm">${isQty ? 'format_list_numbered' : 'settings'}</span>
                                ${group.name}
                            </div>
                            <div class="config-grid ${isQty ? 'config-grid-qty' : 'grid grid-cols-2 gap-2'}">
                                ${group.options.map(opt => `
                                    <div class="config-card p-4 border-2 border-slate-100 rounded-2xl cursor-pointer hover:border-primary transition-all flex flex-col gap-1" data-cost="${opt.price}">
                                        <input type="radio" name="conf-${group.name.replace(/\s/g, '-')}" class="hidden">
                                        <span class="config-card-label text-[10px] font-black uppercase text-slate-800">${opt.name}</span>
                                        <span class="config-card-price text-[9px] font-bold text-slate-400">${opt.price > 0 ? `+ R$ ${opt.price.toFixed(2)}` : 'Incluso'}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }).join('')
                : `<div class="p-12 text-center border-2 border-dashed rounded-[32px] border-slate-100 opacity-50 italic">Sem variações avançadas para este produto.</div>`;

            area.innerHTML = `
                <div class="p-6 rounded-[28px] bg-white border border-slate-100 flex items-center gap-4 mb-8">
                    <div class="w-20 h-20 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 flex-shrink-0 shadow-inner">
                        <img src="${p.image || 'https://via.placeholder.com/200'}" class="w-full h-full object-cover">
                    </div>
                    <div>
                        <h4 class="text-xl font-black text-slate-800 tracking-tight">${p.name}</h4>
                        <span class="badge badge-purple">${p.category}</span>
                    </div>
                </div>
                ${variationsHtml}
            `;
            
            area.querySelectorAll('.config-card').forEach(card => {
                card.onclick = () => {
                    const group = card.closest('.config-group');
                    group.querySelectorAll('.config-card').forEach(c => c.classList.remove('card-active', 'border-primary', 'bg-indigo-50/50', 'shadow-lg', 'shadow-indigo-100/50'));
                    card.classList.add('card-active', 'border-primary', 'bg-indigo-50/50', 'shadow-lg', 'shadow-indigo-100/50');
                    card.querySelector('input').checked = true;
                };
            });
        };

        // --- BINDINGS GERAIS ---
        
        document.getElementById('btn-add-quote')?.addEventListener('click', () => {
            modal.classList.remove('hidden');
            Quotes.currentItems = [];
            Quotes.updateItemsUI();
            // Iniciar com o catálogo aberto por padrão para facilitar
            window.addItem('catalogo');
        });
        
        document.getElementById('close-quote-modal')?.addEventListener('click', () => modal.classList.add('hidden'));
        document.getElementById('close-item-modal')?.addEventListener('click', () => itemModal.classList.add('hidden'));
        document.getElementById('btn-cancel-item')?.addEventListener('click', () => itemModal.classList.add('hidden'));

        ['q-shipping', 'q-install', 'q-urgency', 'q-discount'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', Quotes.calculateFinalTotal);
        });

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
            const extras = (parseFloat(document.getElementById('q-shipping').value) || 0) + (parseFloat(document.getElementById('q-install').value) || 0) + (parseFloat(document.getElementById('q-urgency').value) || 0);
            const discount = parseFloat(document.getElementById('q-discount').value) || 0;

            const newQuote = {
                id: `ORC-${Math.floor(1000 + Math.random() * 9000)}`,
                date: new Date().toLocaleDateString('pt-BR'),
                customerName,
                whatsapp: document.getElementById('q-whatsapp').value,
                items: [...Quotes.currentItems],
                value: subtotal + extras - discount,
                status: 'Pendente',
                obs: document.getElementById('q-obs').value
            };

            const q = DB.get('quotes') || [];
            q.unshift(newQuote);
            DB.save('quotes', q);
            import('../app.js').then(m => m.default.toast('Orçamento salvo!', 'success'));
            modal.classList.add('hidden');
            Quotes.render(container);
        };

        window.shareQuote = (id) => {
            const q = (DB.get('quotes') || []).find(it => it.id === id);
            if (!q) return;
            const fmt = (v) => parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            let msg = `*ORÇAMENTO - ${q.id}* 📄✨\n------------------------------\n*Cliente:* ${q.customerName}\n\n`;
            q.items.forEach((it, idx) => {
                msg += `*${idx + 1}. ${it.name}*\nQtd: ${it.qty} un\nSubtotal: ${fmt(it.total)}\n\n`;
            });
            msg += `------------------------------\n*TOTAL FINAL:* ${fmt(q.value)}\n_Gerado por Gestor Gráfico Pro_`;
            const phone = q.whatsapp ? q.whatsapp.replace(/\D/g, '') : '';
            window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
        };

        window.convertToSale = (id) => {
            import('../app.js').then(m => {
                m.default.confirm({
                    title: 'Aprovar Orçamento?',
                    message: 'Isso enviará os itens diretamente para a produção no Kanban.',
                    confirmLabel: 'Aprovar agora',
                    onConfirm: () => {
                        const quotes = DB.get('quotes') || [];
                        const qIdx = quotes.findIndex(it => it.id === id);
                        if (qIdx === -1) return;
                        quotes[qIdx].status = 'Aprovado';
                        DB.save('quotes', quotes);
                        
                        const orders = DB.get('orders') || [];
                        quotes[qIdx].items.forEach(it => {
                            orders.unshift({ id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`, date: new Date().toLocaleDateString('pt-BR'), customerName: quotes[qIdx].customerName, productName: it.name, value: it.total, status: 'Aguardando Arte' });
                        });
                        DB.save('orders', orders);
                        m.default.toast('Venda registrada!', 'success');
                        Quotes.render(container);
                    }
                });
            });
        };
    }
};

export default Quotes;
