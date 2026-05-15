import DB from '../db.js';

const Quotes = {
    currentItems: [],
    
    render: (container) => {
        const quotes = DB.get('quotes') || [];
        const customers = DB.get('customers') || [];
        const fmtBRL = (v) => parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        container.innerHTML = `
            <div class="max-w-[1500px] mx-auto animate-in fade-in duration-500 pb-10">
                
                <!-- Page Header -->
                <div class="flex justify-between items-end mb-8">
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                            <span class="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Painel Comercial</span>
                        </div>
                        <h2 class="text-4xl font-black text-slate-800 tracking-tighter">Gestão de Orçamentos</h2>
                    </div>
                    <div class="flex gap-3">
                        <button class="btn-ghost border-slate-200 bg-white"><span class="material-symbols-outlined">filter_list</span></button>
                        <button id="btn-add-quote" class="btn-primary shadow-2xl shadow-indigo-200 px-8 py-4 !rounded-2xl">
                            <span class="material-symbols-outlined">add_shopping_cart</span>
                            NOVA PROPOSTA
                        </button>
                    </div>
                </div>

                <!-- Lista de Propostas Profissional -->
                <div class="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b">
                                <th class="px-8 py-5"># ID / Data</th>
                                <th class="px-8 py-5">Cliente / Empresa</th>
                                <th class="px-8 py-5 text-center">Itens</th>
                                <th class="px-8 py-5">Timeline / Status</th>
                                <th class="px-8 py-5 text-right">Total</th>
                                <th class="px-8 py-5 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${quotes.length === 0 ? `
                                <tr>
                                    <td colspan="6" class="px-8 py-32 text-center opacity-30">
                                        <span class="material-symbols-outlined text-6xl block mb-4">analytics</span>
                                        <p class="text-xl font-bold italic">Nenhum orçamento em aberto no momento.</p>
                                    </td>
                                </tr>
                            ` : quotes.map(q => `
                                <tr class="hover:bg-slate-50/80 transition-all group cursor-pointer">
                                    <td class="px-8 py-6">
                                        <p class="text-sm font-black text-primary">${q.id}</p>
                                        <p class="text-[10px] font-bold text-slate-400 uppercase">${q.date}</p>
                                    </td>
                                    <td class="px-8 py-6">
                                        <p class="text-sm font-black text-slate-700">${q.customerName}</p>
                                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">${q.whatsapp || 'SEM CONTATO'}</p>
                                    </td>
                                    <td class="px-8 py-6 text-center">
                                        <span class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mx-auto text-[11px] font-black text-slate-600">${q.items?.length || 0}</span>
                                    </td>
                                    <td class="px-8 py-6">
                                        <div class="flex items-center gap-1">
                                            <div class="w-3 h-3 rounded-full bg-emerald-500"></div>
                                            <div class="h-1 w-6 bg-slate-200 rounded-full"></div>
                                            <div class="w-3 h-3 rounded-full bg-slate-200"></div>
                                            <div class="h-1 w-6 bg-slate-200 rounded-full"></div>
                                            <div class="w-3 h-3 rounded-full bg-slate-200"></div>
                                            <span class="ml-3 badge ${q.status === 'Aprovado' ? 'badge-green' : 'badge-purple'}">${q.status}</span>
                                        </div>
                                    </td>
                                    <td class="px-8 py-6 text-right font-black text-slate-800 text-lg">${fmtBRL(q.value)}</td>
                                    <td class="px-8 py-6">
                                        <div class="flex justify-center gap-2">
                                            <button onclick="window.shareQuote('${q.id}')" class="p-2.5 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"><span class="material-symbols-outlined !text-[20px]">share</span></button>
                                            <button onclick="window.convertToSale('${q.id}')" class="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><span class="material-symbols-outlined !text-[20px]">shopping_cart_checkout</span></button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- MODAL ERP PROFISSIONAL -->
            <div id="quote-modal" class="modal-overlay hidden">
                <div class="modal-container max-w-[1300px] h-[95vh] flex flex-col bg-slate-50 border-0 shadow-2xl">
                    
                    <!-- Top Bar (Header) -->
                    <div class="px-8 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
                        <div class="flex items-center gap-4">
                            <div class="p-2 bg-primary rounded-xl"><span class="material-symbols-outlined !text-white">assignment</span></div>
                            <div>
                                <h3 class="text-sm font-black uppercase tracking-[0.2em]">Central de Pedidos v2.0</h3>
                                <p class="text-[10px] font-bold text-slate-400">Ambiente de Alta Performance Gráfica</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-6">
                            <div class="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800 border border-slate-700">
                                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span class="text-[10px] font-black uppercase tracking-widest text-slate-300">Rascunho Salvo</span>
                            </div>
                            <button id="close-quote-modal" class="text-slate-500 hover:text-white transition-all"><span class="material-symbols-outlined">close</span></button>
                        </div>
                    </div>

                    <!-- Work Area -->
                    <div class="flex-1 flex overflow-hidden">
                        
                        <!-- MAIN COLUMN (70%) -->
                        <div class="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                            
                            <!-- Section 1: Cliente -->
                            <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-end gap-6">
                                <div class="flex-1 grid grid-cols-2 gap-4 w-full">
                                    <div>
                                        <label class="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Cliente (Autocomplete)</label>
                                        <div class="relative">
                                            <span class="material-symbols-outlined absolute left-4 top-3 text-slate-300 !text-[20px]">person_search</span>
                                            <input type="text" id="q-customer" placeholder="Busque ou cadastre..." list="customers-list" class="w-full pl-12 h-12 bg-slate-50 border-slate-100 focus:bg-white transition-all">
                                            <datalist id="customers-list">${customers.map(c => `<option value="${c.name}">`).join('')}</datalist>
                                        </div>
                                    </div>
                                    <div>
                                        <label class="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">WhatsApp de Cobrança</label>
                                        <div class="relative">
                                            <span class="material-symbols-outlined absolute left-4 top-3 text-emerald-400 !text-[20px]">add_call</span>
                                            <input type="text" id="q-whatsapp" placeholder="(00) 00000-0000" class="w-full pl-12 h-12 bg-slate-50 border-slate-100 focus:bg-white transition-all">
                                        </div>
                                    </div>
                                </div>
                                <button class="h-12 px-6 rounded-2xl border border-dashed border-indigo-200 text-primary bg-indigo-50/30 hover:bg-indigo-50 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                                    <span class="material-symbols-outlined !text-[18px]">person_add</span> NOVO CLIENTE
                                </button>
                            </div>

                            <!-- Section 2: Botões de Ação de Itens -->
                            <div class="flex flex-col md:flex-row gap-4">
                                <button onclick="window.addItem('catalogo')" class="flex-1 p-6 rounded-[24px] bg-slate-900 text-white hover:scale-[1.02] transition-all flex items-center gap-4 group shadow-xl shadow-slate-200">
                                    <div class="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center group-hover:rotate-12 transition-all"><span class="material-symbols-outlined !text-white">inventory_2</span></div>
                                    <div class="text-left">
                                        <p class="text-xs font-black uppercase tracking-widest text-indigo-300">Catálogo</p>
                                        <p class="text-lg font-black tracking-tighter">Produto Profissional</p>
                                    </div>
                                </button>
                                <button onclick="window.addItem('avulso')" class="flex-1 p-6 rounded-[24px] bg-white border border-slate-200 text-slate-700 hover:scale-[1.02] transition-all flex items-center gap-4 group shadow-sm">
                                    <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:rotate-12 transition-all"><span class="material-symbols-outlined">design_services</span></div>
                                    <div class="text-left">
                                        <p class="text-xs font-black uppercase tracking-widest text-slate-400">Customizado</p>
                                        <p class="text-lg font-black tracking-tighter text-slate-800">Serviço ou Item Avulso</p>
                                    </div>
                                </button>
                            </div>

                            <!-- Section 3: Itens Empilhados (SEM ESPAÇO VAZIO) -->
                            <div class="space-y-3">
                                <div class="flex justify-between items-center px-2">
                                    <div class="flex items-center gap-4">
                                        <h4 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Itens do Pedido</h4>
                                        <span id="items-count-badge" class="px-2 py-0.5 rounded-full bg-slate-900 text-[10px] font-black text-white">0 ITENS</span>
                                    </div>
                                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prazo Total Est: <b id="total-deadline" class="text-slate-700">0 dias</b></span>
                                </div>
                                <div id="items-list-container" class="space-y-3">
                                    <!-- Cards compactos injetados aqui -->
                                    <div class="p-16 text-center border-2 border-dashed border-slate-200 rounded-[32px] opacity-30 flex flex-col items-center gap-2">
                                        <span class="material-symbols-outlined text-4xl">add_shopping_cart</span>
                                        <p class="text-sm font-black italic">Aguardando inclusão de produtos...</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Section 4: Extras (Observações e Taxas) -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                    <h4 class="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Ajustes Financeiros</h4>
                                    <div class="grid grid-cols-2 gap-4">
                                        <div>
                                            <label class="text-[9px] font-black text-slate-400 uppercase mb-1 block italic">Custo Frete</label>
                                            <input type="number" id="q-shipping" value="0" class="w-full h-10 bg-slate-50 border-0">
                                        </div>
                                        <div>
                                            <label class="text-[9px] font-black text-slate-400 uppercase mb-1 block italic">Taxa Urgência</label>
                                            <input type="number" id="q-urgency" value="0" class="w-full h-10 bg-slate-50 border-0">
                                        </div>
                                        <div>
                                            <label class="text-[9px] font-black text-slate-400 uppercase mb-1 block italic">Instalação</label>
                                            <input type="number" id="q-install" value="0" class="w-full h-10 bg-slate-50 border-0">
                                        </div>
                                        <div>
                                            <label class="text-[9px] font-black text-slate-400 uppercase mb-1 block italic">Desconto Final (R$)</label>
                                            <input type="number" id="q-discount" value="0" class="w-full h-10 bg-emerald-50 border-0 text-emerald-700 font-black">
                                        </div>
                                    </div>
                                </div>
                                <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                    <h4 class="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Observações Técnicas</h4>
                                    <textarea id="q-obs" rows="3" class="w-full bg-slate-50 border-0 resize-none" placeholder="Ex: Produzir em lona fosca, acabamento com ilhós a cada 20cm..."></textarea>
                                </div>
                            </div>
                        </div>

                        <!-- RIGHT SIDEBAR (30% - FIXED SUMMARY) -->
                        <div class="w-[400px] bg-white border-l border-slate-200 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
                            <div class="p-8 flex-1 overflow-y-auto scrollbar-hide">
                                <h4 class="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] mb-8 pb-4 border-b">Detalhamento do Pedido</h4>
                                
                                <div id="summary-items-list" class="space-y-5 mb-10">
                                    <!-- Mini Itens -->
                                </div>

                                <div class="space-y-4 pt-6 border-t border-dashed">
                                    <div class="flex justify-between text-xs font-bold text-slate-400"><span>SUBTOTAL ITENS</span><span id="summ-subtotal" class="text-slate-800">R$ 0,00</span></div>
                                    <div class="flex justify-between text-xs font-bold text-indigo-600"><span>TAXAS E FRETE</span><span id="summ-extras">+ R$ 0,00</span></div>
                                    <div class="flex justify-between text-xs font-bold text-emerald-600"><span>DESCONTO APLICADO</span><span id="summ-discount">- R$ 0,00</span></div>
                                    
                                    <div class="pt-8 mt-4 border-t-4 border-slate-900">
                                        <p class="text-[11px] font-black text-primary uppercase tracking-[0.3em] mb-1">TOTAL DA PROPOSTA</p>
                                        <p id="summ-total" class="text-5xl font-black text-slate-900 tracking-tighter">R$ 0,00</p>
                                    </div>
                                    
                                    <!-- Mini Timeline visual -->
                                    <div class="pt-10 space-y-4">
                                        <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest">Status do Fluxo</p>
                                        <div class="flex items-center justify-between">
                                            <div class="flex flex-col items-center gap-2">
                                                <div class="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-black">1</div>
                                                <span class="text-[8px] font-black text-primary uppercase">Orçamento</span>
                                            </div>
                                            <div class="h-0.5 flex-1 bg-slate-100 mx-1 mb-4"></div>
                                            <div class="flex flex-col items-center gap-2">
                                                <div class="w-6 h-6 rounded-full bg-slate-100 text-slate-300 flex items-center justify-center text-[10px] font-black">2</div>
                                                <span class="text-[8px] font-black text-slate-300 uppercase">Produção</span>
                                            </div>
                                            <div class="h-0.5 flex-1 bg-slate-100 mx-1 mb-4"></div>
                                            <div class="flex flex-col items-center gap-2">
                                                <div class="w-6 h-6 rounded-full bg-slate-100 text-slate-300 flex items-center justify-center text-[10px] font-black">3</div>
                                                <span class="text-[8px] font-black text-slate-300 uppercase">Finalizado</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Sidebar Actions Footer -->
                            <div class="p-8 bg-slate-50 border-t border-slate-200 space-y-4">
                                <button id="btn-save-quote" class="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3">
                                    <span class="material-symbols-outlined">check_circle</span> FINALIZAR E SALVAR
                                </button>
                                <div class="grid grid-cols-2 gap-3">
                                    <button class="py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                                        <span class="material-symbols-outlined !text-[18px]">picture_as_pdf</span> PDF
                                    </button>
                                    <button id="btn-share-whatsapp" class="py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100">
                                        <span class="material-symbols-outlined !text-[18px]">share</span> WHATSAPP
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SUB-MODAL CONFIGURADOR -->
            <div id="item-modal" class="modal-overlay hidden" style="z-index: 100;">
                <div class="modal-container max-w-[850px] !p-0">
                    <div class="p-6 border-b flex justify-between items-center bg-white rounded-t-3xl">
                        <h3 id="item-modal-title" class="text-lg font-black text-slate-800">Configurar Item</h3>
                        <button id="close-item-modal" class="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all"><span class="material-symbols-outlined">close</span></button>
                    </div>
                    <div id="item-modal-body" class="p-8 bg-slate-50 max-h-[70vh] overflow-y-auto"></div>
                    <div class="p-6 border-t bg-white flex justify-end gap-3 rounded-b-3xl">
                        <button id="btn-cancel-item" class="btn-ghost">Descartar</button>
                        <button id="btn-confirm-item" class="btn-primary !px-10">Confirmar Item</button>
                    </div>
                </div>
            </div>
        `;

        Quotes.initEvents(container);
    },

    initEvents: (container) => {
        const modal = document.getElementById('quote-modal');
        const itemModal = document.getElementById('item-modal');
        const customers = DB.get('customers') || [];

        // --- HANDLERS DE ITENS ---
        
        window.addItem = (type) => {
            const body = document.getElementById('item-modal-body');
            const title = document.getElementById('item-modal-title');
            
            if (type === 'avulso') {
                title.innerText = 'Item Avulso / Serviço Externo';
                body.innerHTML = `
                    <div class="grid grid-cols-1 gap-6">
                        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <label class="text-[10px] font-black text-slate-400 uppercase mb-2 block">Nome / Descrição do Serviço</label>
                            <input type="text" id="ai-name" class="w-full text-lg font-black" placeholder="Ex: Criação de Arte para Outdoor">
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                <label class="text-[10px] font-black text-slate-400 uppercase mb-2 block">Quantidade</label>
                                <input type="number" id="ai-qty" value="1" class="w-full text-xl font-black">
                            </div>
                            <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                <label class="text-[10px] font-black text-slate-400 uppercase mb-2 block">Valor Unitário (R$)</label>
                                <input type="number" id="ai-price" value="0" step="0.01" class="w-full text-xl font-black text-primary">
                            </div>
                        </div>
                    </div>
                `;
            } else {
                title.innerText = 'Produto do Catálogo';
                const products = DB.get('products') || [];
                body.innerHTML = `
                    <div class="space-y-6">
                        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <label class="text-[10px] font-black text-slate-400 uppercase mb-2 block">Selecionar Produto</label>
                            <input type="text" id="ai-product-search" class="w-full" placeholder="Comece a digitar..." list="p-list-ai">
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
                    newItem = { id: Math.random().toString(36).substr(2, 5).toUpperCase(), name, qty, unitPrice: price, total: qty * price, type: 'avulso', options: [], deadline: '1 a 2 dias' };
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
                    import('../app.js').then(m => m.default.toast('Item adicionado ao pedido!'));
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

            document.getElementById('items-count-badge').innerText = `${Quotes.currentItems.length} ITENS`;

            if (Quotes.currentItems.length === 0) {
                container.innerHTML = `<div class="p-16 text-center border-2 border-dashed border-slate-200 rounded-[32px] opacity-30 flex flex-col items-center gap-2">
                    <span class="material-symbols-outlined text-4xl">add_shopping_cart</span>
                    <p class="text-sm font-black italic">Aguardando inclusão de produtos...</p>
                </div>`;
                summary.innerHTML = '';
            } else {
                container.innerHTML = Quotes.currentItems.map((it, idx) => `
                    <div class="bg-white p-5 rounded-[24px] border border-slate-200 flex items-center gap-6 group hover:border-primary transition-all animate-in slide-in-from-right-4 duration-300">
                        <!-- Icon/Drag -->
                        <div class="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 flex-shrink-0 cursor-grab active:cursor-grabbing">
                            <span class="material-symbols-outlined">drag_indicator</span>
                        </div>
                        
                        <!-- Content -->
                        <div class="flex-1 min-w-0">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h5 class="text-sm font-black text-slate-800 uppercase tracking-tight truncate max-w-[400px]">${it.name}</h5>
                                    <div class="flex items-center gap-3 mt-1">
                                        <span class="text-[10px] font-bold text-slate-400">Qtd: <b class="text-slate-700">${it.qty} un</b></span>
                                        <span class="text-[10px] font-bold text-slate-400">Prazo: <b class="text-slate-700">${it.deadline || '—'}</b></span>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <p class="text-lg font-black text-slate-800">${fmt(it.total)}</p>
                                    <p class="text-[9px] font-bold text-slate-400 uppercase italic">Unit: ${fmt(it.unitPrice)}</p>
                                </div>
                            </div>
                            <!-- Variations Row -->
                            <div class="flex flex-wrap gap-1 mt-3">
                                ${it.options.map(o => `<span class="px-2 py-0.5 rounded-md bg-indigo-50 text-[9px] font-black text-primary uppercase">${o}</span>`).join('')}
                            </div>
                        </div>

                        <!-- Actions -->
                        <div class="flex gap-1 border-l pl-5 border-slate-100 opacity-0 group-hover:opacity-100 transition-all">
                            <button onclick="window.duplicateItem(${idx})" class="w-9 h-9 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-primary transition-all" title="Duplicar"><span class="material-symbols-outlined !text-[18px]">content_copy</span></button>
                            <button onclick="window.removeItem(${idx})" class="w-9 h-9 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all" title="Remover"><span class="material-symbols-outlined !text-[18px]">delete</span></button>
                        </div>
                    </div>
                `).join('');
                
                summary.innerHTML = Quotes.currentItems.map(it => `
                    <div class="flex justify-between items-center group">
                        <div class="max-w-[70%]">
                            <p class="text-[10px] font-black text-slate-800 uppercase truncate group-hover:text-primary transition-all underline decoration-slate-100 decoration-2">${it.name}</p>
                            <p class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">${it.qty} un • ${it.deadline || '3d'}</p>
                        </div>
                        <span class="text-xs font-black text-slate-700">${fmt(it.total)}</span>
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
                        <div class="config-group mt-6 first:mt-0">
                            <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <span class="material-symbols-outlined !text-sm">${isQty ? 'tag' : 'reorder'}</span>
                                ${group.name}
                            </div>
                            <div class="grid ${isQty ? 'grid-cols-4 gap-2' : 'grid-cols-2 gap-2'}">
                                ${group.options.map(opt => `
                                    <div class="config-card p-4 rounded-2xl border-2 border-white bg-white hover:border-primary transition-all cursor-pointer flex flex-col gap-0.5 shadow-sm" data-cost="${opt.price}">
                                        <input type="radio" name="conf-${group.name.replace(/\s/g, '-')}" class="hidden">
                                        <span class="config-card-label text-[10px] font-black uppercase text-slate-700">${opt.name}</span>
                                        <span class="config-card-price text-[9px] font-bold text-slate-400">${opt.price > 0 ? `+ R$ ${opt.price.toFixed(2)}` : 'Incluso'}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }).join('')
                : `<div class="p-12 text-center border-2 border-dashed rounded-3xl border-slate-200 opacity-40">Sem opções avançadas.</div>`;

            area.innerHTML = `
                <div class="flex items-center gap-5 p-6 rounded-3xl bg-slate-900 text-white mb-8 shadow-xl shadow-slate-200">
                    <div class="w-16 h-16 rounded-2xl overflow-hidden bg-white/10 p-1 flex-shrink-0">
                        <img src="${p.image || 'https://via.placeholder.com/200'}" class="w-full h-full object-cover rounded-xl">
                    </div>
                    <div>
                        <h4 class="text-xl font-black tracking-tight">${p.name}</h4>
                        <p class="text-[10px] font-black text-primary uppercase tracking-widest">${p.category}</p>
                    </div>
                </div>
                ${variationsHtml}
            `;
            
            area.querySelectorAll('.config-card').forEach(card => {
                card.onclick = () => {
                    const group = card.closest('.config-group');
                    group.querySelectorAll('.config-card').forEach(c => c.classList.remove('card-active', 'border-primary', 'bg-indigo-50/50'));
                    card.classList.add('card-active', 'border-primary', 'bg-indigo-50/50');
                    card.querySelector('input').checked = true;
                };
            });
        };

        // --- BINDINGS GERAIS ---
        
        document.getElementById('btn-add-quote')?.addEventListener('click', () => {
            modal.classList.remove('hidden');
            Quotes.currentItems = [];
            Quotes.updateItemsUI();
        });
        
        document.getElementById('close-quote-modal')?.addEventListener('click', () => modal.classList.add('hidden'));
        document.getElementById('close-item-modal')?.addEventListener('click', () => itemModal.classList.add('hidden'));
        document.getElementById('btn-cancel-item')?.addEventListener('click', () => itemModal.classList.add('hidden'));

        ['q-shipping', 'q-urgency', 'q-install', 'q-discount'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', Quotes.calculateFinalTotal);
        });

        document.getElementById('btn-save-quote').onclick = () => {
            const customerName = document.getElementById('q-customer').value;
            if (!customerName || Quotes.currentItems.length === 0) {
                import('../app.js').then(m => m.default.toast('Preencha o cliente e adicione itens!', 'warning'));
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
                status: 'Pendente'
            };

            const q = DB.get('quotes') || [];
            q.unshift(newQuote);
            DB.save('quotes', q);
            import('../app.js').then(m => m.default.toast('Orçamento finalizado com sucesso!', 'success'));
            modal.classList.add('hidden');
            Quotes.render(container);
        };

        window.shareQuote = (id) => {
            const q = (DB.get('quotes') || []).find(it => it.id === id);
            if (!q) return;
            const fmt = (v) => parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            let msg = `*PROPOSTA COMERCIAL - ${q.id}* 📄✨\n------------------------------\n*Cliente:* ${q.customerName}\n\n`;
            q.items.forEach((it, idx) => {
                msg += `*${idx + 1}. ${it.name}*\nQtd: ${it.qty} un\nValor: ${fmt(it.total)}\n\n`;
            });
            msg += `------------------------------\n*TOTAL FINAL:* ${fmt(q.value)}\n_Gerado por Gestor Gráfico Pro_`;
            const phone = q.whatsapp ? q.whatsapp.replace(/\D/g, '') : '';
            window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
        };

        window.convertToSale = (id) => {
            import('../app.js').then(m => {
                m.default.confirm({
                    title: 'Converter em Pedido?',
                    message: 'Isso aprovará o orçamento e enviará os itens para o Kanban de Produção.',
                    confirmLabel: 'Aprovar Agora',
                    onConfirm: () => {
                        const quotes = DB.get('quotes') || [];
                        const q = quotes.find(it => it.id === id);
                        if (q) {
                            q.status = 'Aprovado';
                            DB.save('quotes', quotes);
                            const orders = DB.get('orders') || [];
                            q.items.forEach(it => {
                                orders.unshift({ id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`, date: new Date().toLocaleDateString('pt-BR'), customerName: q.customerName, productName: it.name, value: it.total, status: 'Aguardando Arte' });
                            });
                            DB.save('orders', orders);
                            m.default.toast('Venda aprovada!', 'success');
                            Quotes.render(container);
                        }
                    }
                });
            });
        };
    }
};

export default Quotes;
