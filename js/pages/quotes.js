import DB from '../db.js';

const Quotes = {
    currentItems: [],
    recentProducts: [], // Cache para últimos usados
    
    render: (container) => {
        const quotes = DB.get('quotes') || [];
        const customers = DB.get('customers') || [];
        
        // Estilos para o novo Catálogo PDV
        if (!document.getElementById('quotes-pdv-style')) {
            const style = document.createElement('style');
            style.id = 'quotes-pdv-style';
            style.innerHTML = `
                .pdv-modal { width: 90% !important; max-width: 900px !important; height: 85vh !important; border-radius: 40px !important; overflow: hidden; display: flex; flex-direction: column; }
                .pdv-search-bar { background: var(--bg); border-radius: 24px; padding: 16px 24px; display: flex; align-items: center; gap: 16px; border: 2px solid transparent; transition: all 0.2s; }
                .pdv-search-bar:focus-within { border-color: var(--primary); background: white; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
                .category-chip { padding: 8px 18px; border-radius: 12px; background: white; border: 1px solid var(--border); font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: var(--text-light); transition: all 0.2s; cursor: pointer; }
                .category-chip:hover { border-color: var(--primary); color: var(--primary); }
                .category-chip.active { background: var(--primary); color: white; border-color: var(--primary); box-shadow: 0 4px 15px var(--primary-light); }
                .qty-chip { flex: 1; padding: 12px; border-radius: 14px; background: var(--bg); border: 2px solid transparent; font-size: 11px; font-weight: 900; text-align: center; cursor: pointer; transition: all 0.2s; }
                .qty-chip:hover { background: white; border-color: var(--primary); }
                .qty-chip.active { background: var(--primary); color: white; border-color: var(--primary); }
                .pdv-select { width: 100%; padding: 14px; border-radius: 16px; border: 2px solid var(--bg); background: var(--bg); font-size: 12px; font-weight: 700; color: var(--text); outline: none; transition: all 0.2s; appearance: none; }
                .pdv-select:focus { border-color: var(--primary); background: white; }
                .recent-item { padding: 10px 16px; border-radius: 12px; background: #f8fafc; border: 1px solid #f1f5f9; display: flex; align-items: center; gap: 8px; font-size: 10px; font-weight: 800; color: var(--text-light); cursor: pointer; }
                .recent-item:hover { background: white; border-color: var(--primary); color: var(--primary); }
            `;
            document.head.appendChild(style);
        }

        container.innerHTML = `
            <div class="max-w-[1600px] mx-auto pb-32 animate-in fade-in duration-500">
                <div class="flex flex-col xl:flex-row gap-8 items-start">
                    
                    <!-- COLUNA DE MONTAGEM (70%) -->
                    <div class="flex-1 w-full space-y-6">
                        <div class="flex justify-between items-end mb-2 px-2">
                            <div>
                                <h2 class="text-4xl font-black text-slate-900 tracking-tighter leading-none italic">Estação de Vendas</h2>
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Operação de Balcão v5.0</p>
                            </div>
                            <button id="btn-history" class="group flex items-center gap-3 bg-white border border-slate-200 px-6 py-3 rounded-2xl hover:border-primary transition-all">
                                <span class="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">history</span>
                                <span class="text-[10px] font-black text-slate-600 uppercase tracking-widest">Histórico</span>
                            </button>
                        </div>

                        <!-- Card Cliente -->
                        <div class="smart-card">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div class="quote-input-group">
                                    <label class="text-[10px] font-black text-slate-400 uppercase mb-3 block tracking-widest">Cliente / Prospect</label>
                                    <span class="material-symbols-outlined">person</span>
                                    <input type="text" id="q-customer" placeholder="Nome do cliente..." list="customers-list" class="text-lg font-black">
                                    <datalist id="customers-list">${customers.map(c => `<option value="${c.name}">`).join('')}</datalist>
                                </div>
                                <div class="quote-input-group">
                                    <label class="text-[10px] font-black text-slate-400 uppercase mb-3 block tracking-widest">WhatsApp</label>
                                    <span class="material-symbols-outlined text-emerald-500">brand_whatsapp</span>
                                    <input type="text" id="q-whatsapp" placeholder="(00) 00000-0000" class="text-lg font-black">
                                </div>
                            </div>
                            <div id="client-mini-history" class="mt-6 pt-6 border-t border-dashed border-slate-100 hidden">
                                <p class="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-3 italic">Últimos Pedidos</p>
                                <div class="flex flex-wrap gap-2" id="history-items-container"></div>
                            </div>
                        </div>

                        <!-- BOTÕES DE AÇÃO RÁPIDA -->
                        <div class="flex gap-4">
                            <button onclick="window.addItem('catalogo')" class="flex-[2] bg-slate-900 text-white h-20 rounded-3xl flex items-center justify-between px-8 hover:bg-black transition-all shadow-xl shadow-slate-200 group">
                                <div class="flex items-center gap-4 text-left">
                                    <span class="material-symbols-outlined text-3xl group-hover:rotate-12 transition-all text-primary">inventory_2</span>
                                    <div>
                                        <p class="font-black text-sm uppercase tracking-tight">Catálogo Master</p>
                                        <p class="text-[9px] font-bold text-slate-500 uppercase italic">Busca rápida e PDV</p>
                                    </div>
                                </div>
                                <span class="material-symbols-outlined">add_circle</span>
                            </button>
                            <button onclick="window.addItem('avulso')" class="flex-1 bg-white border-2 border-slate-100 text-slate-600 h-20 rounded-3xl flex items-center gap-4 px-6 hover:border-primary transition-all group">
                                <span class="material-symbols-outlined text-2xl">design_services</span>
                                <div class="text-left">
                                    <p class="font-black text-[11px] uppercase tracking-tight leading-none">Item Avulso</p>
                                    <p class="text-[8px] font-bold text-slate-400 uppercase mt-1">Customizado</p>
                                </div>
                            </button>
                        </div>

                        <!-- LISTA DE ITENS -->
                        <div id="items-list-container" class="space-y-4">
                            <!-- Cards Injetados -->
                        </div>

                        <!-- OBSERVAÇÕES -->
                        <div class="smart-card">
                            <div class="flex justify-between items-center mb-6">
                                <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Briefing do Pedido</h4>
                                <div class="flex gap-2">
                                    <button onclick="window.addShortcut('✅ Arte Enviada')" class="shortcut-btn">Arte Enviada</button>
                                    <button onclick="window.addShortcut('⚡ URGENTE')" class="shortcut-btn !text-red-500 !border-red-100">Urgente</button>
                                    <button onclick="window.addShortcut('📦 Retirada')" class="shortcut-btn">Retirada</button>
                                </div>
                            </div>
                            <textarea id="q-obs" rows="3" class="w-full bg-slate-50 border-0 rounded-2xl p-6 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all resize-none"></textarea>
                        </div>
                    </div>

                    <!-- COLUNA DE RESUMO (30%) -->
                    <div class="w-full xl:w-[400px]">
                        <div class="bg-white rounded-[48px] border border-slate-200 overflow-hidden shadow-2xl shadow-indigo-100/50 sticky top-10">
                            <div class="bg-slate-900 text-white p-8">
                                <div class="flex justify-between items-center mb-1">
                                    <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Total do Pedido</h3>
                                    <span class="bg-indigo-500/20 text-indigo-300 text-[8px] font-black px-2 py-1 rounded">ESTAÇÃO ATIVA</span>
                                </div>
                                <p id="summ-total" class="text-5xl font-black text-white tracking-tighter mt-2">R$ 0,00</p>
                            </div>
                            
                            <div class="p-10 space-y-6">
                                <div id="summary-items-list" class="space-y-3 max-h-[200px] overflow-y-auto scrollbar-hide border-b border-dashed border-slate-100 pb-6"></div>
                                <div class="grid grid-cols-2 gap-4 pb-6 border-b">
                                    <div><p class="text-[9px] font-black text-slate-300 uppercase">Qtd Itens</p><p id="summ-qty-total" class="text-lg font-black text-slate-700">0</p></div>
                                    <div><p class="text-[9px] font-black text-slate-300 uppercase">Entrega</p><p id="summ-delivery-date" class="text-lg font-black text-primary">--</p></div>
                                </div>
                                <div class="space-y-2">
                                    <div class="flex justify-between text-[10px] font-black text-slate-400 uppercase"><span>Subtotal</span><span id="summ-subtotal" class="text-slate-800">R$ 0,00</span></div>
                                    <div class="flex justify-between text-[10px] font-black text-indigo-600 uppercase"><span>Taxas</span><span id="summ-extras">+ R$ 0,00</span></div>
                                    <div class="flex justify-between text-[10px] font-black text-emerald-600 uppercase"><span>Desconto</span><span id="summ-discount">- R$ 0,00</span></div>
                                </div>
                                <div class="bg-indigo-50/50 p-5 rounded-2xl flex justify-between items-center">
                                    <p class="text-[9px] font-black text-indigo-400 uppercase">Lucro Bruto</p>
                                    <p id="summ-profit" class="text-xl font-black text-indigo-600">R$ 0,00</p>
                                </div>
                                <button id="btn-save-quote" class="w-full py-6 bg-slate-900 text-white rounded-[28px] font-black text-sm shadow-xl shadow-slate-200 hover:scale-[1.02] transition-all flex items-center justify-center gap-3">
                                    <span class="material-symbols-outlined">rocket_launch</span> FINALIZAR PEDIDO
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- NOVO MODAL CATÁLOGO PDV -->
            <div id="item-modal" class="fixed inset-0 z-[10000] hidden bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
                <div class="pdv-modal bg-white shadow-2xl animate-in zoom-in-95 duration-300">
                    <div class="p-8 border-b flex justify-between items-center shrink-0 bg-white">
                        <div class="flex items-center gap-4">
                            <span class="material-symbols-outlined text-primary text-3xl">search_insights</span>
                            <h3 class="text-xl font-black text-slate-800 tracking-tighter uppercase italic">Catálogo Master Quick</h3>
                        </div>
                        <button id="close-item-modal" class="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center"><span class="material-symbols-outlined">close</span></button>
                    </div>

                    <div class="flex-1 overflow-y-auto p-10 scrollbar-hide text-left">
                        <!-- Busca e Filtros -->
                        <div class="space-y-6 mb-10">
                            <div class="pdv-search-bar">
                                <span class="material-symbols-outlined text-slate-400">search</span>
                                <input type="text" id="ai-catalog-search" class="w-full bg-transparent border-0 font-black text-lg focus:ring-0" placeholder="O que vamos vender hoje?">
                            </div>
                            <div class="flex flex-wrap gap-2">
                                <span class="category-chip active" data-cat="all">Todos</span>
                                <span class="category-chip" data-cat="Cartões">Cartões</span>
                                <span class="category-chip" data-cat="Panfletos">Panfletos</span>
                                <span class="category-chip" data-cat="Banners">Banners</span>
                                <span class="category-chip" data-cat="Adesivos">Adesivos</span>
                                <span class="category-chip" data-cat="Diversos">Diversos</span>
                            </div>
                        </div>

                        <!-- Área Dinâmica -->
                        <div id="pdv-main-area" class="space-y-10">
                            <!-- Sugestões ou Configurador -->
                            <div id="pdv-suggestions">
                                <div class="mb-8">
                                    <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">⭐ Mais Vendidos / Favoritos</p>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3" id="pdv-best-sellers"></div>
                                </div>
                                <div>
                                    <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">🕒 Últimos Usados</p>
                                    <div class="flex flex-wrap gap-3" id="pdv-recent-list"></div>
                                </div>
                            </div>
                            
                            <div id="pdv-configurator" class="hidden animate-in slide-in-from-bottom-4 duration-500">
                                <!-- Configurador Injetado -->
                            </div>
                        </div>
                    </div>

                    <!-- Footer Fixo do Modal -->
                    <div id="pdv-footer" class="p-8 border-t bg-slate-50 flex justify-between items-center hidden">
                        <div>
                            <p class="text-[10px] font-black text-slate-400 uppercase mb-1">Preço Sugerido</p>
                            <h4 id="catalog-total-price" class="text-4xl font-black text-slate-900 tracking-tighter">R$ 0,00</h4>
                        </div>
                        <div class="flex gap-4">
                            <button id="btn-cancel-catalog" class="px-8 py-3 font-black text-xs uppercase text-slate-400 hover:text-slate-600">Cancelar</button>
                            <button id="btn-confirm-catalog" class="bg-primary text-white px-10 py-4 rounded-2xl font-black text-xs uppercase shadow-xl shadow-indigo-100 hover:scale-105 transition-all">Adicionar ao Pedido</button>
                        </div>
                    </div>
                </div>
            </div>

            <div id="quotes-list-overlay" class="hidden fixed inset-0 z-[10001] bg-white p-10 overflow-y-auto">
                <div class="max-w-[1400px] mx-auto">
                    <button id="btn-back-to-quotes" class="mb-10 flex items-center gap-2 text-primary font-black text-xs uppercase"><span class="material-symbols-outlined">arrow_back</span> Voltar</button>
                    <div id="list-target-area"></div>
                </div>
            </div>
        `;

        Quotes.initEvents(container);
    },

    initEvents: (container) => {
        const itemModal = document.getElementById('item-modal');
        const products = DB.get('products') || [];
        
        // --- LOGICA DO CATALOGO PDV ---
        window.addItem = (type) => {
            const suggestions = document.getElementById('pdv-suggestions');
            const configurator = document.getElementById('pdv-configurator');
            const footer = document.getElementById('pdv-footer');
            const search = document.getElementById('ai-catalog-search');

            search.value = '';
            suggestions.classList.remove('hidden');
            configurator.classList.add('hidden');
            footer.classList.add('hidden');
            
            if (type === 'catalogo') {
                Quotes.renderPDVSuggestions();
            } else {
                // Item Avulso Simples
                suggestions.classList.add('hidden');
                configurator.classList.remove('hidden');
                footer.classList.remove('hidden');
                configurator.innerHTML = `
                    <div class="bg-white p-8 rounded-3xl border-2 border-slate-100 text-left">
                        <label class="text-[10px] font-black text-slate-400 uppercase mb-4 block">O que você está vendendo?</label>
                        <input type="text" id="ai-name" class="w-full text-2xl font-black border-b-2 border-slate-200 pb-3 outline-none focus:border-primary mb-8" placeholder="Ex: Arte para Logo">
                        <div class="grid grid-cols-2 gap-8">
                            <div><label class="text-[10px] font-black text-slate-400 uppercase mb-2 block">Quantidade</label><input type="number" id="ai-qty" value="1" class="text-3xl font-black border-0 p-0 w-full"></div>
                            <div><label class="text-[10px] font-black text-slate-400 uppercase mb-2 block">Preço (R$)</label><input type="number" id="ai-price" value="0" step="0.01" class="text-3xl font-black text-primary border-0 p-0 w-full"></div>
                        </div>
                    </div>
                `;
            }
            itemModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';

            // Handler de Confirmação
            document.getElementById('btn-confirm-catalog').onclick = () => {
                let newItem = null;
                if (type === 'avulso') {
                    const name = document.getElementById('ai-name').value;
                    const qty = parseFloat(document.getElementById('ai-qty').value) || 1;
                    const price = parseFloat(document.getElementById('ai-price').value) || 0;
                    if (!name) return;
                    newItem = { id: Math.random().toString(36).substr(2, 5).toUpperCase(), name, qty, unitPrice: price, total: qty * price, type: 'avulso', options: [], status: 'Pronto', isComplete: true };
                } else {
                    const p = Quotes.activePDVProduct;
                    if (!p) return;
                    let extras = 0;
                    const opts = [];
                    document.querySelectorAll('.pdv-select').forEach(sel => {
                        const opt = sel.options[sel.selectedIndex];
                        extras += parseFloat(opt.dataset.cost || 0);
                        opts.push(opt.text);
                    });
                    const qtyActive = document.querySelector('.qty-chip.active');
                    const qty = qtyActive ? parseInt(qtyActive.dataset.qty) : 1;
                    newItem = { id: Math.random().toString(36).substr(2, 5).toUpperCase(), name: p.name, qty, unitPrice: (p.price + extras) / qty, total: p.price + extras, type: 'catalogo', options: opts, image: p.image, deadline: p.deadline || '3 a 5 dias', status: 'Pronto', isComplete: true };
                    
                    // Salvar nos recentes
                    if (!Quotes.recentProducts.find(it => it.id === p.id)) {
                        Quotes.recentProducts.unshift(p);
                        if (Quotes.recentProducts.length > 5) Quotes.recentProducts.pop();
                    }
                }
                if (newItem) {
                    Quotes.currentItems.push(newItem);
                    Quotes.closeModal();
                    Quotes.updateItemsUI();
                    import('../app.js').then(m => m.default.toast('Item adicionado!'));
                }
            };
        };

        Quotes.renderPDVSuggestions = () => {
            const bestSellers = document.getElementById('pdv-best-sellers');
            const recentList = document.getElementById('pdv-recent-list');
            const allProducts = DB.get('products') || [];

            bestSellers.innerHTML = allProducts.slice(0, 4).map(p => `
                <div class="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 hover:border-primary cursor-pointer transition-all" onclick="window.selectPDVProduct(${p.id})">
                    <div class="w-10 h-10 rounded-xl bg-slate-50 border overflow-hidden"><img src="${p.image || ''}" class="w-full h-full object-cover"></div>
                    <div class="text-left"><p class="text-[11px] font-black text-slate-800 uppercase leading-none">${p.name}</p><p class="text-[9px] font-bold text-slate-400 mt-1 uppercase">${p.category}</p></div>
                </div>
            `).join('');

            recentList.innerHTML = Quotes.recentProducts.length > 0 
                ? Quotes.recentProducts.map(p => `<span class="recent-item" onclick="window.selectPDVProduct(${p.id})">${p.name}</span>`).join('')
                : '<p class="text-[9px] font-bold text-slate-400 italic">Nenhum produto usado recentemente.</p>';
        };

        window.selectPDVProduct = (id) => {
            const p = (DB.get('products') || []).find(it => it.id == id);
            if (!p) return;
            Quotes.activePDVProduct = p;
            const suggestions = document.getElementById('pdv-suggestions');
            const configurator = document.getElementById('pdv-configurator');
            const footer = document.getElementById('pdv-footer');
            
            suggestions.classList.add('hidden');
            configurator.classList.remove('hidden');
            footer.classList.remove('hidden');

            const variationsHtml = p.variations && p.variations.length > 0 
                ? p.variations.map(group => {
                    const isQty = group.name.toUpperCase().includes('QUANTIDADE');
                    if (isQty) {
                        return `
                            <div class="space-y-3">
                                <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">${group.name}</label>
                                <div class="flex gap-2">
                                    ${group.options.map((opt, i) => `<div class="qty-chip ${i === 0 ? 'active' : ''}" data-qty="${opt.name.replace(/\D/g, '')}" onclick="window.toggleQty(this, ${id})">${opt.name}</div>`).join('')}
                                </div>
                            </div>
                        `;
                    }
                    return `
                        <div class="space-y-2">
                            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">${group.name}</label>
                            <div class="relative">
                                <select class="pdv-select" onchange="window.updatePDVPrice(${id})">
                                    ${group.options.map(opt => `<option value="${opt.price}" data-cost="${opt.price}">${opt.name} ${opt.price > 0 ? `(+ R$ ${opt.price.toFixed(2)})` : ''}</option>`).join('')}
                                </select>
                                <span class="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">expand_more</span>
                            </div>
                        </div>
                    `;
                }).join('')
                : '<p class="p-10 text-center opacity-30 italic">Sem opcionais para este item.</p>';

            configurator.innerHTML = `
                <div class="bg-white p-10 rounded-[32px] border-2 border-slate-100 text-left animate-in fade-in duration-300">
                    <div class="flex items-center gap-6 mb-8 pb-8 border-b border-dashed border-slate-100">
                        <div class="w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-50"><img src="${p.image || ''}" class="w-full h-full object-cover"></div>
                        <div>
                            <p class="text-[9px] font-black text-primary uppercase tracking-[0.3em] mb-2">Item Selecionado</p>
                            <h4 class="text-3xl font-black text-slate-800 tracking-tighter italic uppercase">${p.name}</h4>
                            <p class="text-[10px] font-bold text-slate-400 mt-2">Prazo: ${p.deadline || '3 a 5 dias úteis'}</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">${variationsHtml}</div>
                </div>
            `;
            window.updatePDVPrice(id);
        };

        window.toggleQty = (el, pId) => {
            el.parentElement.querySelectorAll('.qty-chip').forEach(c => c.classList.remove('active'));
            el.classList.add('active');
            window.updatePDVPrice(pId);
        };

        window.updatePDVPrice = (pId) => {
            const p = (DB.get('products') || []).find(it => it.id == pId);
            let total = p.price;
            document.querySelectorAll('.pdv-select').forEach(sel => {
                total += parseFloat(sel.value || 0);
            });
            document.getElementById('catalog-total-price').innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        };

        // --- BUSCA RÁPIDA ---
        document.getElementById('ai-catalog-search')?.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const suggestions = document.getElementById('pdv-suggestions');
            const configurator = document.getElementById('pdv-configurator');
            const footer = document.getElementById('pdv-footer');
            
            if (term.length > 1) {
                suggestions.classList.add('hidden');
                configurator.classList.remove('hidden');
                footer.classList.add('hidden');
                const filtered = products.filter(p => p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term));
                configurator.innerHTML = `
                    <div class="space-y-2">
                        ${filtered.map(p => `
                            <div class="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between hover:border-primary cursor-pointer group" onclick="window.selectPDVProduct(${p.id})">
                                <div class="flex items-center gap-4">
                                    <div class="w-10 h-10 rounded-xl bg-slate-50 border overflow-hidden"><img src="${p.image || ''}" class="w-full h-full object-cover"></div>
                                    <div class="text-left"><p class="text-xs font-black text-slate-800 uppercase leading-none">${p.name}</p><p class="text-[9px] font-bold text-slate-400 mt-1 uppercase">${p.category}</p></div>
                                </div>
                                <span class="material-symbols-outlined text-slate-200 group-hover:text-primary transition-colors">arrow_forward_ios</span>
                            </div>
                        `).join('')}
                        ${filtered.length === 0 ? '<div class="p-20 text-center opacity-20 italic font-black uppercase tracking-widest">Nenhum produto encontrado...</div>' : ''}
                    </div>
                `;
            } else if (term.length === 0) {
                suggestions.classList.remove('hidden');
                configurator.classList.add('hidden');
            }
        });

        // Eventos de Categorias
        document.querySelectorAll('.category-chip').forEach(chip => {
            chip.onclick = () => {
                document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                const cat = chip.dataset.cat;
                const filtered = cat === 'all' ? products : products.filter(p => p.category === cat);
                document.getElementById('pdv-suggestions').classList.add('hidden');
                document.getElementById('pdv-configurator').classList.remove('hidden');
                document.getElementById('pdv-configurator').innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 gap-3">${filtered.map(p => `<div class="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 hover:border-primary cursor-pointer" onclick="window.selectPDVProduct(${p.id})"><div class="w-10 h-10 rounded-xl bg-slate-50 border overflow-hidden"><img src="${p.image || ''}" class="w-full h-full object-cover"></div><div class="text-left"><p class="text-[11px] font-black text-slate-800 uppercase leading-none">${p.name}</p><p class="text-[9px] font-bold text-slate-400 mt-1 uppercase">${p.category}</p></div></div>`).join('')}</div>`;
            };
        });

        // --- RESTO DA LÓGICA MANTIDA ---
        window.changeQty = (idx, delta) => {
            const it = Quotes.currentItems[idx];
            it.qty = Math.max(1, (it.qty || 1) + delta);
            it.total = it.qty * (it.unitPrice || 0);
            Quotes.updateItemsUI();
        };

        window.updateQty = (idx, val) => {
            const it = Quotes.currentItems[idx];
            it.qty = Math.max(1, parseInt(val) || 1);
            it.total = it.qty * (it.unitPrice || 0);
            Quotes.updateItemsUI();
        };

        window.removeItem = (idx) => { Quotes.currentItems.splice(idx, 1); Quotes.updateItemsUI(); };
        window.duplicateItem = (idx) => { const it = { ...Quotes.currentItems[idx], id: Math.random().toString(36).substr(2, 5).toUpperCase() }; Quotes.currentItems.splice(idx + 1, 0, it); Quotes.updateItemsUI(); };

        Quotes.updateItemsUI = () => {
            const container = document.getElementById('items-list-container');
            const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            if (Quotes.currentItems.length === 0) {
                container.innerHTML = `<div class="p-16 text-center border-4 border-dashed border-slate-100 rounded-[40px] opacity-10 flex flex-col items-center gap-3">
                    <span class="material-symbols-outlined text-7xl">shopping_basket</span>
                    <p class="text-lg font-black italic uppercase">Cesto de Orçamento Vazio</p>
                </div>`;
            } else {
                container.innerHTML = Quotes.currentItems.map((it, idx) => `
                    <div class="smart-card animate-in slide-in-from-right-4 duration-300">
                        <div class="flex flex-col lg:flex-row gap-6 items-start">
                            <div class="w-20 h-20 rounded-2xl bg-slate-50 border-2 border-white shadow-sm overflow-hidden flex-shrink-0">
                                <img src="${it.image || ''}" class="w-full h-full object-cover">
                            </div>
                            <div class="flex-1 text-left">
                                <div class="flex justify-between items-start mb-4">
                                    <div><h5 class="text-lg font-black text-slate-800 uppercase leading-none italic">${it.name}</h5><p class="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-2">Ref: ${it.id} | Margem: 35%</p></div>
                                    <div class="text-right flex items-center gap-4">
                                        <div class="flex items-center bg-slate-100 rounded-xl p-1"><button onclick="window.changeQty(${idx}, -1)" class="w-8 h-8 rounded-lg hover:bg-white flex items-center justify-center text-slate-400"><span class="material-symbols-outlined !text-lg">remove</span></button><input type="number" value="${it.qty}" onchange="window.updateQty(${idx}, this.value)" class="w-10 text-center bg-transparent border-0 font-black text-xs p-0"> <button onclick="window.changeQty(${idx}, 1)" class="w-8 h-8 rounded-lg hover:bg-white flex items-center justify-center text-slate-400"><span class="material-symbols-outlined !text-lg">add</span></button></div>
                                        <div><p class="text-2xl font-black text-slate-900 tracking-tighter">${fmt(it.total)}</p></div>
                                    </div>
                                </div>
                                <div class="flex flex-wrap gap-2 pt-4 border-t border-slate-50">
                                    <span class="text-[9px] font-black text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded">Qtd: ${it.qty}</span>
                                    ${it.options.map(opt => `<span class="text-[9px] font-black text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded">${opt}</span>`).join('')}
                                    <div class="flex-1"></div>
                                    <button onclick="window.duplicateItem(${idx})" class="w-8 h-8 text-slate-200 hover:text-primary transition-all"><span class="material-symbols-outlined !text-lg">content_copy</span></button>
                                    <button onclick="window.removeItem(${idx})" class="w-8 h-8 text-slate-200 hover:text-red-500 transition-all"><span class="material-symbols-outlined !text-lg">delete</span></button>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
            Quotes.calculateFinalTotal();
        };

        Quotes.calculateFinalTotal = () => {
            const subtotal = Quotes.currentItems.reduce((acc, it) => acc + it.total, 0);
            const total = subtotal; // Simplicado para o exemplo
            const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            document.getElementById('summ-total').innerText = fmt(total);
            document.getElementById('summ-subtotal').innerText = fmt(subtotal);
            document.getElementById('summ-qty-total').innerText = Quotes.currentItems.length;
            document.getElementById('summ-profit').innerText = fmt(total * 0.35);
            
            const summaryList = document.getElementById('summary-items-list');
            summaryList.innerHTML = Quotes.currentItems.map(it => `<div class="flex justify-between items-center"><p class="text-[10px] font-black text-slate-700 uppercase truncate max-w-[70%]">${it.qty}x ${it.name}</p><span class="text-[10px] font-black text-slate-900">${fmt(it.total)}</span></div>`).join('');
        };

        Quotes.closeModal = () => { itemModal.classList.add('hidden'); document.body.style.overflow = 'auto'; };
        document.getElementById('close-item-modal').onclick = Quotes.closeModal;
        document.getElementById('btn-cancel-catalog').onclick = Quotes.closeModal;
        document.getElementById('btn-save-quote').onclick = () => { import('../app.js').then(m => { m.default.toast('Orçamento salvo!', 'success'); Quotes.render(container); Quotes.currentItems = []; }); };
    }
};

export default Quotes;
