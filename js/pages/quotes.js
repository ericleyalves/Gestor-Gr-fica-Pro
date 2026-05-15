import DB from '../db.js';

const Quotes = {
    currentItems: [],
    
    render: (container) => {
        const quotes = DB.get('quotes') || [];
        const customers = DB.get('customers') || [];
        const fmtBRL = (v) => parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        container.innerHTML = `
            <div class="max-w-[1500px] mx-auto animate-in fade-in duration-500 pb-24 lg:pb-10">
                
                <!-- MAIN LAYOUT: 70/30 -->
                <div class="flex flex-col xl:flex-row gap-8">
                    
                    <!-- LEFT COLUMN (70%) -->
                    <div class="w-full xl:w-[70%] flex flex-col gap-6">
                        
                        <!-- Header -->
                        <header class="flex justify-between items-center mb-2">
                            <div>
                                <div class="flex items-center gap-3 mb-1">
                                    <h2 class="text-3xl font-black text-slate-800 tracking-tighter">Novo Orçamento</h2>
                                </div>
                                <p class="text-slate-500 font-medium">Monte uma proposta comercial completa e profissional</p>
                            </div>
                            <button id="btn-list-quotes" class="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2">
                                <span class="material-symbols-outlined !text-[18px]">list_alt</span> VER LISTAGEM
                            </button>
                        </header>

                        <!-- Customer Selection Area -->
                        <section class="bg-white rounded-[24px] shadow-sm p-8 border border-slate-200/60">
                            <div class="flex flex-col md:flex-row gap-6 items-end">
                                <div class="flex-1 w-full">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cliente</label>
                                    <div class="relative">
                                        <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">person_search</span>
                                        <input id="q-customer" class="w-full pl-12 pr-4 py-3 bg-slate-50 border-slate-100 rounded-xl focus:bg-white transition-all text-sm font-bold" placeholder="Buscar cliente por nome..." type="text" list="customers-list">
                                        <datalist id="customers-list">${customers.map(c => `<option value="${c.name}">`).join('')}</datalist>
                                    </div>
                                </div>
                                <div class="w-full md:w-64">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">WhatsApp</label>
                                    <div class="relative">
                                        <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 !text-[20px]">call</span>
                                        <input id="q-whatsapp" class="w-full pl-12 pr-4 py-3 bg-slate-50 border-slate-100 rounded-xl focus:bg-white transition-all text-sm font-bold" placeholder="(00) 00000-0000" type="text"/>
                                    </div>
                                </div>
                                <button class="w-full md:w-auto px-6 py-3 bg-indigo-50 text-primary rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 whitespace-nowrap">
                                    <span class="material-symbols-outlined text-[18px]">person_add</span> NOVO CLIENTE
                                </button>
                            </div>
                        </section>

                        <!-- Action Bar -->
                        <div class="flex flex-wrap gap-3">
                            <button onclick="window.addItem('catalogo')" class="px-6 py-3.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-black transition-all flex items-center gap-2">
                                <span class="material-symbols-outlined text-[18px]">add_shopping_cart</span> Produto do Catálogo
                            </button>
                            <button onclick="window.addItem('avulso')" class="px-6 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                                <span class="material-symbols-outlined text-[18px]">design_services</span> Item Avulso
                            </button>
                            <button onclick="window.addItem('avulso')" class="px-6 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                                <span class="material-symbols-outlined text-[18px]">settings_accessibility</span> Serviço
                            </button>
                        </div>

                        <!-- Itens do Pedido Area -->
                        <section class="flex flex-col gap-4">
                            <div class="flex items-center justify-between px-2">
                                <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Itens Adicionados</h3>
                                <span id="items-count" class="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-md">0 ITENS</span>
                            </div>
                            
                            <div id="items-list-container" class="space-y-4">
                                <!-- Cards Injetados -->
                                <div class="p-20 text-center border-2 border-dashed border-slate-200 rounded-[32px] opacity-30 flex flex-col items-center gap-4">
                                    <span class="material-symbols-outlined text-6xl text-slate-400">add_shopping_cart</span>
                                    <p class="text-sm font-black italic">Sua lista de pedidos está vazia.</p>
                                </div>
                            </div>
                        </section>

                        <!-- Extras Area -->
                        <section class="bg-white rounded-[24px] shadow-sm p-8 border border-slate-200/60">
                            <h3 class="text-xs font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center gap-2">
                                <span class="material-symbols-outlined !text-lg text-primary">add_circle</span> Ajustes de Fechamento
                            </h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-[10px] font-black text-slate-400 uppercase mb-2">Frete (R$)</label>
                                        <input id="q-shipping" class="w-full px-4 py-2 bg-slate-50 border-0 rounded-xl focus:bg-white transition-all text-sm font-bold" placeholder="0,00" type="number" value="0"/>
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-black text-slate-400 uppercase mb-2">Taxa de Urgência (R$)</label>
                                        <input id="q-urgency" class="w-full px-4 py-2 bg-slate-50 border-0 rounded-xl focus:bg-white transition-all text-sm font-bold" placeholder="0,00" type="number" value="0"/>
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-black text-slate-400 uppercase mb-2">Instalação / Arte (R$)</label>
                                        <input id="q-install" class="w-full px-4 py-2 bg-slate-50 border-0 rounded-xl focus:bg-white transition-all text-sm font-bold" placeholder="0,00" type="number" value="0"/>
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-black text-slate-400 uppercase mb-2">Desconto (R$)</label>
                                        <input id="q-discount" class="w-full px-4 py-2 bg-emerald-50 border-0 rounded-xl focus:bg-white transition-all text-sm font-black text-emerald-700" placeholder="0,00" type="number" value="0"/>
                                    </div>
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Observações Gerais (Impressas)</label>
                                    <textarea id="q-obs" class="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:bg-white transition-all resize-none h-full text-sm font-medium" placeholder="Ex: Pagamento 50% entrada e 50% na entrega..." rows="4"></textarea>
                                </div>
                            </div>
                        </section>
                    </div>

                    <!-- RIGHT COLUMN (30% STICKY SIDEBAR) -->
                    <div class="w-full xl:w-[30%]">
                        <div class="sticky top-10 flex flex-col gap-6">
                            
                            <!-- Order Summary Card -->
                            <div class="bg-white rounded-[32px] shadow-2xl shadow-indigo-100/50 border border-slate-200 overflow-hidden flex flex-col">
                                <div class="p-8 bg-slate-900 text-white">
                                    <h3 class="text-sm font-black uppercase tracking-[0.2em]">Resumo do Pedido</h3>
                                </div>
                                <div class="p-8 flex flex-col gap-6">
                                    <!-- Item List -->
                                    <div id="summary-items-list" class="flex flex-col gap-4 pb-6 border-b border-slate-100 max-h-[300px] overflow-y-auto scrollbar-hide">
                                        <!-- Mini Itens -->
                                    </div>

                                    <!-- Subtotals -->
                                    <div class="flex flex-col gap-3 pb-6 border-b border-slate-100">
                                        <div class="flex justify-between items-center text-xs font-bold text-slate-400"><span>Subtotal</span><span id="summ-subtotal" class="text-slate-800">R$ 0,00</span></div>
                                        <div class="flex justify-between items-center text-xs font-bold text-indigo-600"><span>Taxas Extras</span><span id="summ-extras">+ R$ 0,00</span></div>
                                        <div class="flex justify-between items-center text-xs font-bold text-emerald-600"><span>Desconto</span><span id="summ-discount">- R$ 0,00</span></div>
                                    </div>

                                    <!-- Total -->
                                    <div class="pt-2">
                                        <div class="flex flex-col items-center gap-1 mb-6">
                                            <span class="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Total Final</span>
                                            <span id="summ-total" class="text-5xl font-black text-slate-900 tracking-tighter leading-none">R$ 0,00</span>
                                        </div>
                                        <div class="flex items-center justify-center gap-2 p-3 bg-slate-50 rounded-2xl text-slate-500">
                                            <span class="material-symbols-outlined !text-[18px]">schedule</span>
                                            <span id="summ-deadline" class="text-[10px] font-black uppercase tracking-widest">Prazo: 3 a 5 dias úteis</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Fixed Action Buttons -->
                            <div class="flex flex-col gap-3">
                                <button id="btn-save-quote" class="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-sm shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3">
                                    <span class="material-symbols-outlined">receipt_long</span> GERAR PEDIDO AGORA
                                </button>
                                <div class="grid grid-cols-2 gap-3">
                                    <button id="btn-share-whatsapp" class="py-4 bg-emerald-500 text-white rounded-[20px] font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100">
                                        <span class="material-symbols-outlined !text-[18px]">chat</span> WHATSAPP
                                    </button>
                                    <button class="py-4 bg-white border border-slate-200 text-slate-700 rounded-[20px] font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                                        <span class="material-symbols-outlined !text-[18px]">picture_as_pdf</span> PDF
                                    </button>
                                </div>
                                <button class="w-full py-3.5 bg-transparent border border-dashed border-slate-300 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-[20px] font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 mt-2">
                                    <span class="material-symbols-outlined !text-[18px]">save</span> SALVAR RASCUNHO
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- MODAL CONFIGURADOR -->
            <div id="item-modal" class="modal-overlay hidden" style="z-index: 100;">
                <div class="modal-container max-w-[850px] !p-0 overflow-hidden shadow-2xl">
                    <div class="p-8 border-b flex justify-between items-center bg-white">
                        <h3 id="item-modal-title" class="text-xl font-black text-slate-800">Configurar Item</h3>
                        <button id="close-item-modal" class="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all"><span class="material-symbols-outlined">close</span></button>
                    </div>
                    <div id="item-modal-body" class="p-10 bg-slate-50 max-h-[70vh] overflow-y-auto">
                        <!-- Conteúdo Dinâmico -->
                    </div>
                    <div class="p-8 border-t bg-white flex justify-end gap-3">
                        <button id="btn-cancel-item" class="btn-ghost">Descartar</button>
                        <button id="btn-confirm-item" class="btn-primary !px-12 !py-4 shadow-xl shadow-indigo-100">Confirmar Item</button>
                    </div>
                </div>
            </div>

            <!-- LISTAGEM DE ORÇAMENTOS (HIDDEN BY DEFAULT) -->
            <div id="quotes-list-container" class="hidden fixed inset-0 z-[60] bg-white p-8 overflow-y-auto">
                 <!-- Botão Voltar -->
                 <div class="max-w-[1400px] mx-auto">
                    <button id="btn-back-to-new" class="mb-8 flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest">
                        <span class="material-symbols-outlined">arrow_back</span> VOLTAR PARA NOVO ORÇAMENTO
                    </button>
                    <div id="list-target"></div>
                 </div>
            </div>
        `;

        Quotes.initEvents(container);
    },

    initEvents: (container) => {
        const itemModal = document.getElementById('item-modal');
        const listContainer = document.getElementById('quotes-list-container');
        
        // --- EVENTOS PRINCIPAIS ---
        
        document.getElementById('btn-list-quotes').onclick = () => {
            listContainer.classList.remove('hidden');
            Quotes.renderList();
        };

        document.getElementById('btn-back-to-new').onclick = () => {
            listContainer.classList.add('hidden');
        };

        // --- HANDLERS DE ITENS ---
        
        window.addItem = (type) => {
            const body = document.getElementById('item-modal-body');
            const title = document.getElementById('item-modal-title');
            
            if (type === 'avulso') {
                title.innerText = 'Adicionar Item Avulso / Serviço';
                body.innerHTML = `
                    <div class="grid grid-cols-1 gap-8">
                        <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                            <label class="text-[10px] font-black text-slate-400 uppercase mb-3 block">Descrição do Serviço</label>
                            <input type="text" id="ai-name" class="w-full text-xl font-black text-slate-800" placeholder="Ex: Criação de Logotipo / Arte para Social Media">
                        </div>
                        <div class="grid grid-cols-2 gap-6">
                            <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                                <label class="text-[10px] font-black text-slate-400 uppercase mb-3 block">Quantidade</label>
                                <input type="number" id="ai-qty" value="1" class="w-full text-2xl font-black">
                            </div>
                            <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                                <label class="text-[10px] font-black text-slate-400 uppercase mb-3 block">Preço Unitário (R$)</label>
                                <input type="number" id="ai-price" value="0" step="0.01" class="w-full text-2xl font-black text-primary">
                            </div>
                        </div>
                    </div>
                `;
            } else {
                title.innerText = 'Adicionar Produto do Catálogo';
                const products = DB.get('products') || [];
                body.innerHTML = `
                    <div class="space-y-8">
                        <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                            <label class="text-[10px] font-black text-slate-400 uppercase mb-3 block">Pesquisar no Catálogo</label>
                            <input type="text" id="ai-product-search" class="w-full text-lg font-bold" placeholder="Digite o nome do produto..." list="p-list-ai">
                            <datalist id="p-list-ai">${products.map(p => `<option value="${p.name}">`).join('')}</datalist>
                        </div>
                        <div id="ai-configurator-area"></div>
                    </div>
                `;
                document.getElementById('ai-product-search').addEventListener('input', (e) => {
                    const p = products.find(it => it.name === e.target.value);
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
                    newItem = { id: Math.random().toString(36).substr(2, 5).toUpperCase(), name, qty, unitPrice: price, total: qty * price, type: 'avulso', options: [], deadline: '1 dia' };
                } else {
                    const pName = document.getElementById('ai-product-search').value;
                    const p = DB.get('products').find(it => it.name === pName);
                    if (!p) return;
                    let extras = 0;
                    const opts = [];
                    document.querySelectorAll('.config-card.card-active').forEach(c => {
                        extras += parseFloat(c.dataset.cost || 0);
                        opts.push(c.querySelector('.config-card-label').innerText);
                    });
                    
                    let qty = 1;
                    const qGroup = Array.from(document.querySelectorAll('.config-group')).find(g => g.innerText.includes('QUANTIDADE'));
                    const qVal = qGroup?.querySelector('.card-active .config-card-label')?.innerText;
                    if (qVal) qty = parseInt(qVal.replace(/\D/g, '')) || 1;
                    
                    newItem = { id: Math.random().toString(36).substr(2, 5).toUpperCase(), name: p.name, qty, unitPrice: (p.price + extras) / qty, total: p.price + extras, type: 'catalogo', options: opts, image: p.image, deadline: '3 a 5 dias' };
                }
                
                if (newItem) {
                    Quotes.currentItems.push(newItem);
                    itemModal.classList.add('hidden');
                    Quotes.updateItemsUI();
                    import('../app.js').then(m => m.default.toast('Item adicionado ao orçamento!'));
                }
            };
        };

        window.removeItem = (idx) => {
            Quotes.currentItems.splice(idx, 1);
            Quotes.updateItemsUI();
        };

        window.duplicateItem = (idx) => {
            const copy = JSON.parse(JSON.stringify(Quotes.currentItems[idx]));
            copy.id = Math.random().toString(36).substr(2, 5).toUpperCase();
            Quotes.currentItems.splice(idx + 1, 0, copy);
            Quotes.updateItemsUI();
            import('../app.js').then(m => m.default.toast('Item duplicado!'));
        };

        Quotes.updateItemsUI = () => {
            const container = document.getElementById('items-list-container');
            const summary = document.getElementById('summary-items-list');
            const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            document.getElementById('items-count').innerText = `${Quotes.currentItems.length} ITENS`;

            if (Quotes.currentItems.length === 0) {
                container.innerHTML = `<div class="p-20 text-center border-2 border-dashed border-slate-200 rounded-[32px] opacity-30 flex flex-col items-center gap-4">
                                    <span class="material-symbols-outlined text-6xl text-slate-400">add_shopping_cart</span>
                                    <p class="text-sm font-black italic">Sua lista de pedidos está vazia.</p>
                                </div>`;
                summary.innerHTML = '';
            } else {
                container.innerHTML = Quotes.currentItems.map((it, idx) => `
                    <div class="bg-white rounded-[24px] border border-slate-200/60 shadow-sm group hover:shadow-xl hover:shadow-indigo-100/50 hover:border-primary transition-all overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                        <div class="p-6 flex flex-col md:flex-row gap-6">
                            <!-- Reorder Handle -->
                            <div class="hidden md:flex items-center text-slate-200 cursor-grab hover:text-slate-400 transition-colors">
                                <span class="material-symbols-outlined">drag_indicator</span>
                            </div>
                            
                            <!-- Item Details -->
                            <div class="flex-1">
                                <div class="flex items-start justify-between mb-4">
                                    <div>
                                        <h4 class="text-lg font-black text-slate-800 uppercase tracking-tight">${it.name}</h4>
                                        <span class="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded font-black text-[9px] uppercase tracking-widest">${it.type === 'avulso' ? 'Serviço Extra' : 'Produto Catálogo'}</span>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-2xl font-black text-primary">${fmt(it.total)}</div>
                                        <p class="text-[9px] font-bold text-slate-400 uppercase italic">Un: ${fmt(it.unitPrice)}</p>
                                    </div>
                                </div>
                                
                                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div>
                                        <span class="block text-[9px] font-black text-slate-400 uppercase mb-1">Quantidade</span>
                                        <span class="text-sm font-black text-slate-700">${it.qty} un</span>
                                    </div>
                                    <div class="col-span-2">
                                        <span class="block text-[9px] font-black text-slate-400 uppercase mb-1">Configurações</span>
                                        <div class="flex flex-wrap gap-1">
                                            ${it.options.length > 0 ? it.options.map(o => `<span class="text-[10px] font-bold text-slate-500">${o}</span>`).join(' • ') : '<span class="text-[10px] italic text-slate-400">Padrão</span>'}
                                        </div>
                                    </div>
                                    <div>
                                        <span class="block text-[9px] font-black text-slate-400 uppercase mb-1">Prazo Est.</span>
                                        <span class="text-sm font-black text-secondary uppercase">${it.deadline || '—'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Card Actions -->
                        <div class="bg-slate-50/50 px-6 py-3 border-t border-slate-100 flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                            <button onclick="window.duplicateItem(${idx})" class="p-2 text-slate-400 hover:text-primary transition-colors rounded-lg hover:bg-white shadow-sm" title="Duplicar">
                                <span class="material-symbols-outlined text-[18px]">content_copy</span>
                            </button>
                            <button onclick="window.removeItem(${idx})" class="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-white shadow-sm" title="Excluir">
                                <span class="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                        </div>
                    </div>
                `).join('');
                
                summary.innerHTML = Quotes.currentItems.map(it => `
                    <div class="flex justify-between items-start gap-4">
                        <span class="text-[11px] font-black text-slate-700 uppercase truncate max-w-[70%] underline decoration-slate-200 underline-offset-4">${it.qty}x ${it.name}</span>
                        <span class="text-[11px] font-black text-slate-900 flex-shrink-0">${fmt(it.total)}</span>
                    </div>
                `).join('');
            }
            Quotes.calculateFinalTotal();
        };

        Quotes.calculateFinalTotal = () => {
            const subtotal = Quotes.currentItems.reduce((acc, it) => acc + it.total, 0);
            const extras = (parseFloat(document.getElementById('q-shipping')?.value) || 0) + 
                           (parseFloat(document.getElementById('q-urgency')?.value) || 0) + 
                           (parseFloat(document.getElementById('q-install')?.value) || 0);
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
                        <div class="config-group mt-8 first:mt-0">
                            <div class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <span class="material-symbols-outlined !text-sm">${isQty ? 'numbers' : 'layers'}</span>
                                ${group.name}
                            </div>
                            <div class="grid ${isQty ? 'grid-cols-4 gap-3' : 'grid-cols-2 gap-3'}">
                                ${group.options.map(opt => `
                                    <div class="config-card p-5 rounded-2xl bg-white border-2 border-slate-100 hover:border-primary transition-all cursor-pointer flex flex-col gap-1 shadow-sm" data-cost="${opt.price}">
                                        <input type="radio" name="conf-${group.name.replace(/\s/g, '-')}" class="hidden">
                                        <span class="config-card-label text-[10px] font-black uppercase text-slate-700">${opt.name}</span>
                                        <span class="config-card-price text-[9px] font-bold text-slate-400">${opt.price > 0 ? `+ R$ ${opt.price.toFixed(2)}` : 'Incluso'}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }).join('')
                : `<div class="p-12 text-center border-2 border-dashed rounded-3xl border-slate-200 opacity-40">Sem opções avançadas para este produto.</div>`;

            area.innerHTML = `
                <div class="flex items-center gap-6 p-8 rounded-[32px] bg-slate-900 text-white mb-10 shadow-2xl shadow-slate-200">
                    <div class="w-20 h-20 rounded-2xl overflow-hidden bg-white/10 p-1 flex-shrink-0">
                        <img src="${p.image || 'https://via.placeholder.com/200'}" class="w-full h-full object-cover rounded-xl shadow-inner">
                    </div>
                    <div>
                        <h4 class="text-2xl font-black tracking-tighter">${p.name}</h4>
                        <span class="inline-block mt-1 px-3 py-1 bg-primary text-[10px] font-black uppercase tracking-widest rounded-lg">${p.category}</span>
                    </div>
                </div>
                ${variationsHtml}
            `;
            
            area.querySelectorAll('.config-card').forEach(card => {
                card.onclick = () => {
                    const group = card.closest('.config-group');
                    group.querySelectorAll('.config-card').forEach(c => c.classList.remove('card-active', 'border-primary', 'bg-indigo-50/50', 'shadow-indigo-50'));
                    card.classList.add('card-active', 'border-primary', 'bg-indigo-50/50', 'shadow-indigo-50');
                    card.querySelector('input').checked = true;
                };
            });
        };

        // --- BINDINGS FINAIS ---
        
        ['q-shipping', 'q-urgency', 'q-install', 'q-discount'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', Quotes.calculateFinalTotal);
        });

        document.getElementById('btn-save-quote').onclick = () => {
            const customerName = document.getElementById('q-customer').value;
            if (!customerName || Quotes.currentItems.length === 0) {
                import('../app.js').then(m => m.default.toast('Selecione um cliente e adicione itens!', 'warning'));
                return;
            }

            const subtotal = Quotes.currentItems.reduce((acc, it) => acc + it.total, 0);
            const extras = (parseFloat(document.getElementById('q-shipping').value) || 0) + (parseFloat(document.getElementById('q-urgency').value) || 0) + (parseFloat(document.getElementById('q-install').value) || 0);
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
            import('../app.js').then(m => m.default.toast('Orçamento gerado e salvo!', 'success'));
            
            // Abrir listagem após salvar
            listContainer.classList.remove('hidden');
            Quotes.renderList();
        };

        // --- WHATSAPP ---
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

        // --- LISTAGEM ---
        Quotes.renderList = () => {
            const target = document.getElementById('list-target');
            const quotes = DB.get('quotes') || [];
            const fmt = (v) => parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            target.innerHTML = `
                <div class="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 border-b">
                                <th class="px-8 py-5">Proposta / Data</th>
                                <th class="px-8 py-5">Cliente</th>
                                <th class="px-8 py-5">Status</th>
                                <th class="px-8 py-5 text-right">Valor Total</th>
                                <th class="px-8 py-5 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${quotes.length === 0 ? `<tr><td colspan="5" class="p-20 text-center opacity-30 italic font-bold">Nenhum orçamento listado.</td></tr>` : quotes.map(q => `
                                <tr class="hover:bg-slate-50/80 transition-all">
                                    <td class="px-8 py-6">
                                        <p class="text-sm font-black text-primary">${q.id}</p>
                                        <p class="text-[9px] font-bold text-slate-400 uppercase">${q.date}</p>
                                    </td>
                                    <td class="px-8 py-6">
                                        <p class="text-sm font-black text-slate-700">${q.customerName}</p>
                                    </td>
                                    <td class="px-8 py-6">
                                        <span class="badge ${q.status === 'Aprovado' ? 'badge-green' : 'badge-purple'}">${q.status}</span>
                                    </td>
                                    <td class="px-8 py-6 text-right font-black text-lg">${fmt(q.value)}</td>
                                    <td class="px-8 py-6">
                                        <div class="flex justify-center gap-2">
                                            <button onclick="window.shareQuote('${q.id}')" class="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"><span class="material-symbols-outlined !text-[20px]">share</span></button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        };
    }
};

export default Quotes;
