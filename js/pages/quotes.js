import DB from '../db.js';

const Quotes = {
    currentItems: [],
    
    render: (container) => {
        const quotes = DB.get('quotes') || [];
        const customers = DB.get('customers') || [];
        const fmtBRL = (v) => parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        // Injetando CSS específico para limpar os bugs de alinhamento
        if (!document.getElementById('quotes-fix-style')) {
            const style = document.createElement('style');
            style.id = 'quotes-fix-style';
            style.innerHTML = `
                .quote-card { background: white; border: 1px solid var(--border); border-radius: 24px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
                .quote-input-group { position: relative; }
                .quote-input-group span { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-light); font-size: 18px !important; }
                .quote-input-group input { padding-left: 40px !important; width: 100%; height: 45px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg); font-size: 13px; font-weight: 600; }
                .quote-btn-add { display: flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 14px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; transition: all 0.2s; }
                .item-card-compact { display: flex; align-items: center; gap: 20px; background: white; border: 1px solid var(--border); border-radius: 18px; padding: 16px; margin-bottom: 12px; transition: all 0.2s; border-left: 5px solid var(--primary); }
                .item-card-compact:hover { transform: translateX(5px); box-shadow: 0 10px 30px rgba(0,0,0,0.05); border-color: var(--primary); }
                .summary-box { background: white; border-radius: 28px; border: 1px solid var(--border); overflow: hidden; position: sticky; top: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.05); }
                .summary-header { background: var(--text); color: white; padding: 20px; }
                .summary-body { padding: 24px; }
                .timeline-step { display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1; position: relative; }
                .timeline-step::after { content: ''; position: absolute; top: 12px; right: -50%; width: 100%; height: 2px; background: var(--border); z-index: 0; }
                .timeline-step:last-child::after { display: none; }
                .timeline-circle { w: 24px; h: 24px; border-radius: 50%; background: var(--border); color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; z-index: 1; }
                .timeline-active .timeline-circle { background: var(--primary); box-shadow: 0 0 15px var(--primary-light); }
                .timeline-label { font-size: 8px; font-weight: 900; color: var(--text-light); text-transform: uppercase; }
                .timeline-active .timeline-label { color: var(--primary); }
            `;
            document.head.appendChild(style);
        }

        container.innerHTML = `
            <div class="max-w-[1500px] mx-auto pb-20 animate-in fade-in duration-500">
                
                <!-- Layout Split 70/30 -->
                <div class="flex flex-col xl:flex-row gap-8 items-start">
                    
                    <!-- LADO ESQUERDO: Construção (70%) -->
                    <div class="flex-1 w-full space-y-6">
                        
                        <!-- Header Simples e Chique -->
                        <div class="flex justify-between items-center mb-4">
                            <div>
                                <h2 class="text-3xl font-black text-slate-800 tracking-tighter">Novo Orçamento</h2>
                                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Painel de Montagem de Pedidos</p>
                            </div>
                            <button id="btn-view-all" class="text-[10px] font-black text-primary uppercase bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-all">Ver todos orçamentos</button>
                        </div>

                        <!-- Card Cliente Compacto -->
                        <div class="quote-card flex flex-col md:flex-row gap-6 items-end">
                            <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full text-left">
                                <div class="quote-input-group">
                                    <label class="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Selecione o Cliente</label>
                                    <span class="material-symbols-outlined">person_search</span>
                                    <input type="text" id="q-customer" placeholder="Busque por nome..." list="customers-list">
                                    <datalist id="customers-list">${customers.map(c => `<option value="${c.name}">`).join('')}</datalist>
                                </div>
                                <div class="quote-input-group">
                                    <label class="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">WhatsApp de Contato</label>
                                    <span class="material-symbols-outlined" style="color:var(--emerald-500)">add_call</span>
                                    <input type="text" id="q-whatsapp" placeholder="(00) 00000-0000">
                                </div>
                            </div>
                            <button class="quote-btn-add border-2 border-dashed border-indigo-200 text-primary hover:bg-indigo-50 h-[45px]">
                                <span class="material-symbols-outlined">person_add</span> Cliente Novo
                            </button>
                        </div>

                        <!-- Barra de Ações de Itens -->
                        <div class="flex gap-3">
                            <button onclick="window.addItem('catalogo')" class="quote-btn-add bg-slate-900 text-white hover:bg-black shadow-lg">
                                <span class="material-symbols-outlined">inventory_2</span> Catálogo de Produtos
                            </button>
                            <button onclick="window.addItem('avulso')" class="quote-btn-add bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">
                                <span class="material-symbols-outlined">design_services</span> Item / Serviço Avulso
                            </button>
                        </div>

                        <!-- Lista de Itens Adicionados -->
                        <div class="space-y-3 min-h-[100px]">
                            <div class="flex justify-between items-center px-2">
                                <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Itens do Pedido</h4>
                                <span id="items-count-tag" class="bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded-full">0 ITENS</span>
                            </div>
                            <div id="items-list-container">
                                <!-- Cards injetados aqui -->
                                <div class="p-16 text-center border-2 border-dashed border-slate-200 rounded-[28px] opacity-30 flex flex-col items-center gap-2">
                                    <span class="material-symbols-outlined text-4xl">shopping_basket</span>
                                    <p class="text-sm font-black italic">O pedido está vazio...</p>
                                </div>
                            </div>
                        </div>

                        <!-- Ajustes de Rodapé (Taxas) -->
                        <div class="quote-card">
                            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <span class="material-symbols-outlined !text-lg text-primary">add_circle</span> Taxas Extras e Descontos
                            </h4>
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div class="quote-input-group">
                                    <label class="text-[9px] font-black text-slate-400 uppercase mb-1 block">Frete (R$)</label>
                                    <input type="number" id="q-shipping" value="0" class="!pl-3">
                                </div>
                                <div class="quote-input-group">
                                    <label class="text-[9px] font-black text-slate-400 uppercase mb-1 block">Urgência (R$)</label>
                                    <input type="number" id="q-urgency" value="0" class="!pl-3">
                                </div>
                                <div class="quote-input-group">
                                    <label class="text-[9px] font-black text-slate-400 uppercase mb-1 block">Instalação (R$)</label>
                                    <input type="number" id="q-install" value="0" class="!pl-3">
                                </div>
                                <div class="quote-input-group">
                                    <label class="text-[9px] font-black text-slate-400 uppercase mb-1 block">Desconto (R$)</label>
                                    <input type="number" id="q-discount" value="0" class="!pl-3 !text-emerald-600 !bg-emerald-50/50">
                                </div>
                            </div>
                            <div class="mt-6">
                                <label class="text-[10px] font-black text-slate-400 uppercase mb-2 block">Observações do Orçamento</label>
                                <textarea id="q-obs" rows="3" class="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm font-medium resize-none" placeholder="Detalhes para impressão..."></textarea>
                            </div>
                        </div>
                    </div>

                    <!-- LADO DIREITO: Resumo Fixo (30%) -->
                    <div class="w-full xl:w-[380px]">
                        <div class="summary-box">
                            <div class="summary-header">
                                <h3 class="text-xs font-black uppercase tracking-[0.2em]">Resumo da Proposta</h3>
                            </div>
                            <div class="summary-body space-y-6 text-left">
                                
                                <div id="summary-items-list" class="space-y-4 max-h-[250px] overflow-y-auto scrollbar-hide border-b border-dashed pb-6">
                                    <!-- Mini Itens -->
                                </div>

                                <div class="space-y-2 pb-6 border-b border-slate-50">
                                    <div class="flex justify-between text-xs font-bold text-slate-400"><span>SUBTOTAL</span><span id="summ-subtotal" class="text-slate-700">R$ 0,00</span></div>
                                    <div class="flex justify-between text-xs font-bold text-indigo-600"><span>EXTRAS</span><span id="summ-extras">+ R$ 0,00</span></div>
                                    <div class="flex justify-between text-xs font-bold text-emerald-600"><span>DESCONTO</span><span id="summ-discount">- R$ 0,00</span></div>
                                </div>

                                <div class="text-center py-4">
                                    <p class="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1">Total Final</p>
                                    <p id="summ-total" class="text-5xl font-black text-slate-900 tracking-tighter">R$ 0,00</p>
                                    <div class="mt-4 flex items-center justify-center gap-2 text-slate-400">
                                        <span class="material-symbols-outlined !text-[16px]">schedule</span>
                                        <span id="summ-deadline" class="text-[9px] font-black uppercase tracking-widest">Entrega: 3 a 5 dias</span>
                                    </div>
                                </div>

                                <!-- Timeline Visual -->
                                <div class="flex justify-between px-2 pt-4">
                                    <div class="timeline-step timeline-active">
                                        <div class="timeline-circle">1</div>
                                        <span class="timeline-label">Orçamento</span>
                                    </div>
                                    <div class="timeline-step">
                                        <div class="timeline-circle">2</div>
                                        <span class="timeline-label">Produção</span>
                                    </div>
                                    <div class="timeline-step">
                                        <div class="timeline-circle">3</div>
                                        <span class="timeline-label">Entrega</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Botões de Ação Final -->
                            <div class="p-6 bg-slate-50 border-t space-y-3">
                                <button id="btn-save-quote" class="w-full py-5 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                                    <span class="material-symbols-outlined">receipt_long</span> GERAR PEDIDO AGORA
                                </button>
                                <div class="grid grid-cols-2 gap-2">
                                    <button id="btn-share-whatsapp" class="py-3 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2">
                                        <span class="material-symbols-outlined !text-[18px]">share</span> WhatsApp
                                    </button>
                                    <button class="py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                                        <span class="material-symbols-outlined !text-[18px]">picture_as_pdf</span> PDF
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- MODAL DE ADIÇÃO (FIXED CENTRALIZADO) -->
            <div id="item-modal" class="modal-overlay hidden" style="z-index: 9999;">
                <div class="modal-container max-w-[800px] h-auto !p-0 shadow-2xl border-0">
                    <div class="p-6 border-b flex justify-between items-center bg-white sticky top-0 z-10">
                        <h3 id="item-modal-title" class="text-lg font-black text-slate-800">Adicionar Item</h3>
                        <button id="close-item-modal" class="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all"><span class="material-symbols-outlined">close</span></button>
                    </div>
                    <div id="item-modal-body" class="p-8 bg-slate-50 max-h-[70vh] overflow-y-auto text-left">
                        <!-- Conteúdo Injetado -->
                    </div>
                    <div class="p-6 border-t bg-white flex justify-end gap-3">
                        <button id="btn-cancel-item" class="btn-ghost">Descartar</button>
                        <button id="btn-confirm-item" class="btn-primary px-10 shadow-lg">Confirmar Item</button>
                    </div>
                </div>
            </div>

            <!-- LISTAGEM (Opcional) -->
            <div id="quotes-list-overlay" class="hidden fixed inset-0 z-[10000] bg-white p-10 overflow-y-auto">
                <div class="max-w-[1200px] mx-auto">
                    <button onclick="document.getElementById('quotes-list-overlay').classList.add('hidden')" class="mb-8 flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest">
                        <span class="material-symbols-outlined">arrow_back</span> Voltar ao Orçamento
                    </button>
                    <div id="list-target-area"></div>
                </div>
            </div>
        `;

        Quotes.initEvents(container);
    },

    initEvents: (container) => {
        const itemModal = document.getElementById('item-modal');
        
        // --- HANDLERS DE ITENS ---
        
        window.addItem = (type) => {
            const body = document.getElementById('item-modal-body');
            const title = document.getElementById('item-modal-title');
            
            if (type === 'avulso') {
                title.innerText = 'Item Avulso / Serviço Externo';
                body.innerHTML = `
                    <div class="space-y-6">
                        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <label class="text-[10px] font-black text-slate-400 uppercase mb-2 block">Nome do Serviço / Produto</label>
                            <input type="text" id="ai-name" class="w-full text-lg font-black text-slate-800 border-0 focus:ring-0 p-0" placeholder="Ex: Arte para Redes Sociais">
                        </div>
                        <div class="grid grid-cols-2 gap-6">
                            <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                <label class="text-[10px] font-black text-slate-400 uppercase mb-2 block">Quantidade</label>
                                <input type="number" id="ai-qty" value="1" class="w-full text-xl font-black border-0 focus:ring-0 p-0">
                            </div>
                            <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                <label class="text-[10px] font-black text-slate-400 uppercase mb-2 block">Preço Unitário (R$)</label>
                                <input type="number" id="ai-price" value="0" step="0.01" class="w-full text-xl font-black text-primary border-0 focus:ring-0 p-0">
                            </div>
                        </div>
                    </div>
                `;
            } else {
                title.innerText = 'Escolher do Catálogo';
                const products = DB.get('products') || [];
                body.innerHTML = `
                    <div class="space-y-6">
                        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <label class="text-[10px] font-black text-slate-400 uppercase mb-2 block">Digite o nome do produto</label>
                            <input type="text" id="ai-product-search" class="w-full text-lg font-black" placeholder="Ex: Panfleto..." list="p-list-ai">
                            <datalist id="p-list-ai">${products.map(p => `<option value="${p.name}">`).join('')}</datalist>
                        </div>
                        <div id="ai-configurator-area" class="space-y-6"></div>
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
                    newItem = { id: Math.random().toString(36).substr(2, 5).toUpperCase(), name, qty, unitPrice: price, total: qty * price, type: 'avulso', options: [] };
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
                    newItem = { id: Math.random().toString(36).substr(2, 5).toUpperCase(), name: p.name, qty, unitPrice: (p.price + extras) / qty, total: p.price + extras, type: 'catalogo', options: opts, image: p.image };
                }
                
                if (newItem) {
                    Quotes.currentItems.push(newItem);
                    itemModal.classList.add('hidden');
                    Quotes.updateItemsUI();
                    import('../app.js').then(m => m.default.toast('Item adicionado!'));
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

            document.getElementById('items-count-tag').innerText = `${Quotes.currentItems.length} ITENS`;

            if (Quotes.currentItems.length === 0) {
                container.innerHTML = `<div class="p-16 text-center border-2 border-dashed border-slate-200 rounded-[28px] opacity-30 flex flex-col items-center gap-2">
                    <span class="material-symbols-outlined text-4xl">shopping_basket</span>
                    <p class="text-sm font-black italic">O pedido está vazio...</p>
                </div>`;
                summary.innerHTML = '';
            } else {
                container.innerHTML = Quotes.currentItems.map((it, idx) => `
                    <div class="item-card-compact animate-in slide-in-from-right-4 duration-300">
                        <div class="w-12 h-12 rounded-xl bg-slate-50 border flex items-center justify-center overflow-hidden flex-shrink-0">
                            ${it.image ? `<img src="${it.image}" class="w-full h-full object-cover">` : `<span class="material-symbols-outlined text-slate-300">${it.type === 'avulso' ? 'design_services' : 'package_2'}</span>`}
                        </div>
                        <div class="flex-1 min-w-0 text-left">
                            <h5 class="text-xs font-black text-slate-800 uppercase tracking-tight truncate">${it.name}</h5>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="text-[9px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">${it.qty} UNIDADES</span>
                                <span class="text-[9px] font-bold text-slate-400 truncate">${it.options.join(' • ')}</span>
                            </div>
                        </div>
                        <div class="text-right flex-shrink-0 mr-4">
                            <p class="text-sm font-black text-slate-800">${fmt(it.total)}</p>
                        </div>
                        <button onclick="window.removeItem(${idx})" class="w-8 h-8 rounded-full text-slate-200 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center flex-shrink-0">
                            <span class="material-symbols-outlined !text-[18px]">delete</span>
                        </button>
                    </div>
                `).join('');
                
                summary.innerHTML = Quotes.currentItems.map(it => `
                    <div class="flex justify-between items-start gap-4">
                        <span class="text-[10px] font-black text-slate-700 uppercase truncate max-w-[70%]">${it.qty}x ${it.name}</span>
                        <span class="text-[10px] font-black text-slate-900">${fmt(it.total)}</span>
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
                        <div class="config-group mt-6 first:mt-0 text-left">
                            <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <span class="material-symbols-outlined !text-sm">${isQty ? 'numbers' : 'layers'}</span>
                                ${group.name}
                            </div>
                            <div class="grid ${isQty ? 'grid-cols-4 gap-2' : 'grid-cols-2 gap-2'}">
                                ${group.options.map(opt => `
                                    <div class="config-card p-3 rounded-xl border-2 border-slate-100 bg-white hover:border-primary transition-all cursor-pointer flex flex-col gap-0.5 shadow-sm" data-cost="${opt.price}">
                                        <input type="radio" name="conf-${group.name.replace(/\s/g, '-')}" class="hidden">
                                        <span class="config-card-label text-[9px] font-black uppercase text-slate-700">${opt.name}</span>
                                        <span class="config-card-price text-[8px] font-bold text-slate-400">${opt.price > 0 ? `+ R$ ${opt.price.toFixed(2)}` : 'Incluso'}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }).join('')
                : `<div class="p-8 text-center border-2 border-dashed rounded-3xl border-slate-100 opacity-50 italic">Sem variações.</div>`;

            area.innerHTML = `
                <div class="flex items-center gap-4 p-4 rounded-2xl bg-slate-900 text-white mb-6">
                    <div class="w-12 h-12 rounded-xl overflow-hidden bg-white/10 p-1 flex-shrink-0">
                        <img src="${p.image || 'https://via.placeholder.com/200'}" class="w-full h-full object-cover rounded-lg">
                    </div>
                    <div class="text-left">
                        <h4 class="text-lg font-black tracking-tighter leading-none">${p.name}</h4>
                        <span class="text-[8px] font-black text-primary uppercase tracking-widest">${p.category}</span>
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

        // --- BINDINGS ---
        
        ['q-shipping', 'q-urgency', 'q-install', 'q-discount'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', Quotes.calculateFinalTotal);
        });

        document.getElementById('btn-save-quote').onclick = () => {
            const customerName = document.getElementById('q-customer').value;
            if (!customerName || Quotes.currentItems.length === 0) {
                import('../app.js').then(m => m.default.toast('Selecione o cliente e adicione itens!', 'warning'));
                return;
            }
            const subtotal = Quotes.currentItems.reduce((acc, it) => acc + it.total, 0);
            const extras = (parseFloat(document.getElementById('q-shipping').value) || 0) + (parseFloat(document.getElementById('q-urgency').value) || 0) + (parseFloat(document.getElementById('q-install').value) || 0);
            const discount = parseFloat(document.getElementById('q-discount').value) || 0;
            const newQuote = { id: `ORC-${Math.floor(1000 + Math.random() * 9000)}`, date: new Date().toLocaleDateString('pt-BR'), customerName, whatsapp: document.getElementById('q-whatsapp').value, items: [...Quotes.currentItems], value: subtotal + extras - discount, status: 'Pendente' };
            const q = DB.get('quotes') || [];
            q.unshift(newQuote);
            DB.save('quotes', q);
            import('../app.js').then(m => { m.default.toast('Orçamento gerado!', 'success'); Quotes.render(container); });
        };

        document.getElementById('btn-view-all').onclick = () => {
            const overlay = document.getElementById('quotes-list-overlay');
            overlay.classList.remove('hidden');
            const target = document.getElementById('list-target-area');
            const quotes = DB.get('quotes') || [];
            const fmt = (v) => parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            target.innerHTML = `
                <div class="bg-white rounded-[32px] border overflow-hidden">
                    <table class="w-full text-left">
                        <thead><tr class="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b"><th class="p-6">ID / Data</th><th class="p-6">Cliente</th><th class="p-6">Status</th><th class="p-6 text-right">Total</th></tr></thead>
                        <tbody class="divide-y divide-slate-50">${quotes.map(q => `<tr class="hover:bg-slate-50 transition-all"><td class="p-6"><p class="text-sm font-black text-primary">${q.id}</p><p class="text-[10px] font-bold text-slate-400 uppercase">${q.date}</p></td><td class="p-6 font-black text-slate-700">${q.customerName}</td><td class="p-6"><span class="badge ${q.status === 'Aprovado' ? 'badge-green' : 'badge-purple'}">${q.status}</span></td><td class="p-6 text-right font-black text-lg">${fmt(q.value)}</td></tr>`).join('')}</tbody>
                    </table>
                </div>
            `;
        };

        document.getElementById('close-item-modal').onclick = () => itemModal.classList.add('hidden');
        document.getElementById('btn-cancel-item').onclick = () => itemModal.classList.add('hidden');
        window.onclick = (e) => { if (e.target === itemModal) itemModal.classList.add('hidden'); };

        window.shareQuote = (id) => {
            const q = (DB.get('quotes') || []).find(it => it.id === id);
            if (!q) return;
            const fmt = (v) => parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            let msg = `*PROPOSTA - ${q.id}*\n*Cliente:* ${q.customerName}\n\n`;
            q.items.forEach((it, idx) => { msg += `*${idx + 1}. ${it.name}*\nQtd: ${it.qty} un | Subtotal: ${fmt(it.total)}\n\n`; });
            msg += `*TOTAL:* ${fmt(q.value)}`;
            window.open(`https://api.whatsapp.com/send?phone=${q.whatsapp.replace(/\D/g, '')}&text=${encodeURIComponent(msg)}`, '_blank');
        };
    }
};

export default Quotes;
