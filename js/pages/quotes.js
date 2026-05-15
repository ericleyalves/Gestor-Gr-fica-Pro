import DB from '../db.js';

const Quotes = {
    currentItems: [],
    
    render: (container) => {
        const quotes = DB.get('quotes') || [];
        const customers = DB.get('customers') || [];
        const fmtBRL = (v) => parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        // Estilos para o novo Catálogo Split
        if (!document.getElementById('quotes-split-style')) {
            const style = document.createElement('style');
            style.id = 'quotes-split-style';
            style.innerHTML = `
                .catalog-modal { width: 95% !important; max-width: 1400px !important; height: 90vh !important; display: flex; flex-direction: column; overflow: hidden; border-radius: 32px; border: none; }
                .catalog-sidebar { width: 320px; border-right: 1px solid var(--border); background: white; display: flex; flex-direction: column; }
                .catalog-content { flex: 1; background: var(--bg); overflow-y: auto; padding: 40px; position: relative; }
                .product-mini-card { padding: 12px; border-radius: 16px; border: 1px solid transparent; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 12px; }
                .product-mini-card:hover { background: var(--primary-light); border-color: var(--primary); }
                .product-mini-card.active { background: var(--primary); color: white; border-color: var(--primary); }
                .product-mini-card.active p { color: white !important; }
                .config-section { background: white; border-radius: 24px; padding: 32px; border: 1px solid var(--border); box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
                .floating-footer { position: sticky; bottom: -40px; left: -40px; right: -40px; background: white; border-top: 1px solid var(--border); padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; z-index: 20; margin-top: 40px; }
            `;
            document.head.appendChild(style);
        }

        container.innerHTML = `
            <div class="max-w-[1500px] mx-auto pb-20 animate-in fade-in duration-500">
                
                <div class="flex flex-col xl:flex-row gap-8 items-start">
                    
                    <!-- LADO ESQUERDO: Carrinho do Orçamento (70%) -->
                    <div class="flex-1 w-full space-y-6">
                        
                        <div class="flex justify-between items-center">
                            <div>
                                <h2 class="text-3xl font-black text-slate-800 tracking-tighter">Estação de Vendas</h2>
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monte pedidos profissionais multitens</p>
                            </div>
                            <button id="btn-history" class="text-[10px] font-black text-slate-400 hover:text-primary transition-all uppercase tracking-widest flex items-center gap-2">
                                <span class="material-symbols-outlined !text-lg">history</span> Ver Histórico
                            </button>
                        </div>

                        <!-- Card Cliente -->
                        <div class="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="quote-input-group">
                                <label class="text-[10px] font-black text-slate-400 uppercase mb-2 block">Cliente / Prospect</label>
                                <span class="material-symbols-outlined">person_search</span>
                                <input type="text" id="q-customer" placeholder="Busque ou digite o nome..." list="customers-list">
                                <datalist id="customers-list">${customers.map(c => `<option value="${c.name}">`).join('')}</datalist>
                            </div>
                            <div class="quote-input-group">
                                <label class="text-[10px] font-black text-slate-400 uppercase mb-2 block">WhatsApp de Entrega</label>
                                <span class="material-symbols-outlined" style="color:var(--emerald-500)">call</span>
                                <input type="text" id="q-whatsapp" placeholder="(00) 00000-0000">
                            </div>
                        </div>

                        <!-- Ações Rápidas -->
                        <div class="flex gap-4">
                            <button onclick="window.addItem('catalogo')" class="flex-1 bg-slate-900 text-white h-16 rounded-2xl flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl shadow-slate-200 group">
                                <span class="material-symbols-outlined group-hover:rotate-12 transition-all">inventory_2</span>
                                <span class="font-black text-xs uppercase tracking-widest">Catálogo de Produtos</span>
                            </button>
                            <button onclick="window.addItem('avulso')" class="flex-1 bg-white border border-slate-200 text-slate-600 h-16 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-sm">
                                <span class="material-symbols-outlined">design_services</span>
                                <span class="font-black text-xs uppercase tracking-widest">Item / Serviço Avulso</span>
                            </button>
                        </div>

                        <!-- Lista de Itens Adicionados -->
                        <div class="space-y-3">
                            <div class="flex justify-between items-center px-2">
                                <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens do Orçamento</h4>
                                <span id="items-count-tag" class="bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded-md">0 ITENS</span>
                            </div>
                            <div id="items-list-container" class="space-y-3">
                                <!-- Cards injetados -->
                            </div>
                        </div>

                        <!-- Taxas Extras -->
                        <div class="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div class="quote-input-group">
                                <label class="text-[9px] font-black text-slate-400 uppercase mb-1 block">Frete</label>
                                <input type="number" id="q-shipping" value="0">
                            </div>
                            <div class="quote-input-group">
                                <label class="text-[9px] font-black text-slate-400 uppercase mb-1 block">Urgência</label>
                                <input type="number" id="q-urgency" value="0">
                            </div>
                            <div class="quote-input-group">
                                <label class="text-[9px] font-black text-slate-400 uppercase mb-1 block">Instalação</label>
                                <input type="number" id="q-install" value="0">
                            </div>
                            <div class="quote-input-group">
                                <label class="text-[9px] font-black text-slate-400 uppercase mb-1 block">Desconto</label>
                                <input type="number" id="q-discount" value="0" class="!text-emerald-600">
                            </div>
                        </div>
                    </div>

                    <!-- LADO DIREITO: Resumo (30%) -->
                    <div class="w-full xl:w-[400px]">
                        <div class="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-2xl shadow-indigo-100/50 sticky top-10">
                            <div class="bg-slate-900 text-white p-6">
                                <h3 class="text-xs font-black uppercase tracking-widest text-indigo-300">Resumo de Fechamento</h3>
                            </div>
                            <div class="p-8 space-y-6">
                                <div id="summary-items-list" class="space-y-4 max-h-[300px] overflow-y-auto scrollbar-hide border-b border-dashed pb-6">
                                    <!-- Mini Itens -->
                                </div>
                                <div class="space-y-2 pb-6 border-b">
                                    <div class="flex justify-between text-xs font-bold text-slate-400 uppercase"><span>Subtotal</span><span id="summ-subtotal" class="text-slate-800">R$ 0,00</span></div>
                                    <div class="flex justify-between text-xs font-bold text-indigo-600 uppercase"><span>Extras</span><span id="summ-extras">+ R$ 0,00</span></div>
                                    <div class="flex justify-between text-xs font-bold text-emerald-600 uppercase"><span>Desconto</span><span id="summ-discount">- R$ 0,00</span></div>
                                </div>
                                <div class="text-center">
                                    <p class="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1">Valor Final</p>
                                    <p id="summ-total" class="text-5xl font-black text-slate-900 tracking-tighter">R$ 0,00</p>
                                </div>
                                <div class="space-y-3 pt-6 border-t border-slate-50">
                                    <button id="btn-save-quote" class="w-full py-5 bg-primary text-white rounded-[24px] font-black text-sm shadow-xl shadow-indigo-100 hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                                        <span class="material-symbols-outlined">receipt_long</span> FINALIZAR PEDIDO
                                    </button>
                                    <div class="grid grid-cols-2 gap-2">
                                        <button id="btn-share-whatsapp" class="py-4 bg-emerald-500 text-white rounded-[20px] font-black text-[9px] uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2">
                                            <span class="material-symbols-outlined !text-lg">share</span> WhatsApp
                                        </button>
                                        <button class="py-4 bg-white border border-slate-200 text-slate-600 rounded-[20px] font-black text-[9px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                                            <span class="material-symbols-outlined !text-lg">picture_as_pdf</span> PDF
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- MODAL CATÁLOGO SPLIT (CENTRALIZADO) -->
            <div id="item-modal" class="fixed inset-0 z-[10000] hidden bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-10">
                <div class="catalog-modal bg-white shadow-[0_0_100px_rgba(0,0,0,0.2)] animate-in zoom-in-95 duration-300">
                    
                    <!-- Header -->
                    <div class="px-8 py-5 border-b flex justify-between items-center bg-white shrink-0">
                        <div class="flex items-center gap-4 text-left">
                            <div class="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg"><span class="material-symbols-outlined">menu_book</span></div>
                            <div>
                                <h3 id="item-modal-title" class="text-xl font-black text-slate-800 tracking-tight leading-none">Catálogo Master</h3>
                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Configurador de Pedidos v3.0</p>
                            </div>
                        </div>
                        <button id="close-item-modal" class="w-10 h-10 rounded-full hover:bg-slate-100 text-slate-400 transition-all flex items-center justify-center"><span class="material-symbols-outlined">close</span></button>
                    </div>

                    <!-- Body Split -->
                    <div class="flex-1 flex overflow-hidden">
                        
                        <!-- Sidebar: Produtos (30%) -->
                        <div id="catalog-sidebar" class="catalog-sidebar p-6 overflow-y-auto scrollbar-hide">
                            <div class="relative mb-6">
                                <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 !text-lg">search</span>
                                <input type="text" id="ai-catalog-search" class="w-full pl-10 pr-4 py-2 bg-slate-50 border-slate-100 rounded-xl text-xs font-bold" placeholder="Pesquisar produto...">
                            </div>
                            <div id="products-mini-list" class="space-y-2">
                                <!-- Injetado -->
                            </div>
                        </div>

                        <!-- Content: Configurator (70%) -->
                        <div id="catalog-content" class="catalog-content scrollbar-hide">
                            <div id="ai-configurator-area" class="max-w-[800px] mx-auto">
                                <div class="p-20 text-center opacity-20 flex flex-col items-center gap-4">
                                    <span class="material-symbols-outlined text-7xl">touch_app</span>
                                    <p class="text-xl font-bold italic">Selecione um produto ao lado para começar.</p>
                                </div>
                            </div>

                            <!-- Footer Flutuante Interno -->
                            <div id="catalog-footer" class="floating-footer hidden animate-in slide-in-from-bottom-4 duration-300">
                                <div>
                                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Preço Sugerido</p>
                                    <h4 id="catalog-total-price" class="text-4xl font-black text-slate-900 tracking-tighter">R$ 0,00</h4>
                                </div>
                                <div class="flex gap-3">
                                    <button id="btn-cancel-catalog" class="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                                    <button id="btn-confirm-catalog" class="px-10 py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:scale-105 transition-all">Adicionar ao Pedido</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- TELA DE HISTÓRICO (OVERLAY) -->
            <div id="quotes-list-overlay" class="hidden fixed inset-0 z-[10001] bg-white p-10 overflow-y-auto">
                <div class="max-w-[1300px] mx-auto animate-in slide-in-from-bottom-8 duration-500">
                    <div class="flex justify-between items-center mb-10">
                        <button id="btn-back-to-quotes" class="flex items-center gap-3 text-primary font-black text-[11px] uppercase tracking-[0.2em] hover:translate-x-[-5px] transition-all">
                            <span class="material-symbols-outlined">arrow_back</span> Voltar ao Painel de Vendas
                        </button>
                        <h3 class="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">Histórico de Propostas</h3>
                    </div>
                    <div id="list-target-area"></div>
                </div>
            </div>
        `;

        Quotes.initEvents(container);
    },

    initEvents: (container) => {
        const itemModal = document.getElementById('item-modal');
        const products = DB.get('products') || [];
        
        // --- LOGICA DO CATALOGO ---
        
        window.addItem = (type) => {
            const sidebar = document.getElementById('catalog-sidebar');
            const content = document.getElementById('catalog-content');
            const footer = document.getElementById('catalog-footer');
            const title = document.getElementById('item-modal-title');
            
            if (type === 'catalogo') {
                sidebar.classList.remove('hidden');
                footer.classList.remove('hidden');
                title.innerText = 'Catálogo Master';
                Quotes.renderProductList(products);
            } else {
                // Item Avulso - Esconde Sidebar e usa layout simples
                sidebar.classList.add('hidden');
                footer.classList.remove('hidden');
                title.innerText = 'Item Avulso / Serviço Externo';
                document.getElementById('ai-configurator-area').innerHTML = `
                    <div class="config-section space-y-6 text-left">
                        <div class="flex items-center gap-3 mb-6">
                            <span class="material-symbols-outlined text-amber-500">design_services</span>
                            <h4 class="text-lg font-black uppercase tracking-tight">Serviço Customizado</h4>
                        </div>
                        <div>
                            <label class="text-[10px] font-black text-slate-400 uppercase mb-2 block">Descrição do Serviço</label>
                            <input type="text" id="ai-name" class="w-full text-xl font-black text-slate-800 border-b border-slate-200 pb-2 focus:border-primary transition-all" placeholder="Ex: Arte para Redes Sociais">
                        </div>
                        <div class="grid grid-cols-2 gap-8">
                            <div>
                                <label class="text-[10px] font-black text-slate-400 uppercase mb-2 block">Quantidade</label>
                                <input type="number" id="ai-qty" value="1" class="w-full text-3xl font-black border-0 p-0">
                            </div>
                            <div>
                                <label class="text-[10px] font-black text-slate-400 uppercase mb-2 block">Valor Unitário (R$)</label>
                                <input type="number" id="ai-price" value="0" step="0.01" class="w-full text-3xl font-black text-primary border-0 p-0">
                            </div>
                        </div>
                    </div>
                `;
            }
            
            itemModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Trava scroll do fundo

            // Ação de Confirmar
            document.getElementById('btn-confirm-catalog').onclick = () => {
                let newItem = null;
                if (type === 'avulso') {
                    const name = document.getElementById('ai-name').value;
                    const qty = parseFloat(document.getElementById('ai-qty').value) || 1;
                    const price = parseFloat(document.getElementById('ai-price').value) || 0;
                    if (!name) return;
                    newItem = { id: Math.random().toString(36).substr(2, 5).toUpperCase(), name, qty, unitPrice: price, total: qty * price, type: 'avulso', options: [] };
                } else {
                    const activeCard = document.querySelector('.product-mini-card.active');
                    if (!activeCard) return;
                    const p = products.find(it => it.id == activeCard.dataset.id);
                    
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
                    Quotes.closeModal();
                    Quotes.updateItemsUI();
                    import('../app.js').then(m => m.default.toast('Item adicionado!'));
                }
            };
        };

        Quotes.renderProductList = (list) => {
            const container = document.getElementById('products-mini-list');
            container.innerHTML = list.map(p => `
                <div class="product-mini-card" data-id="${p.id}">
                    <div class="w-10 h-10 rounded-lg bg-slate-50 border overflow-hidden flex-shrink-0">
                        <img src="${p.image || 'https://via.placeholder.com/200'}" class="w-full h-full object-cover">
                    </div>
                    <div class="min-w-0">
                        <p class="text-[10px] font-black text-slate-800 uppercase truncate">${p.name}</p>
                        <p class="text-[8px] font-bold text-slate-400 uppercase">${p.category}</p>
                    </div>
                </div>
            `).join('');

            container.querySelectorAll('.product-mini-card').forEach(card => {
                card.onclick = () => {
                    container.querySelectorAll('.product-mini-card').forEach(c => c.classList.remove('active'));
                    card.classList.add('active');
                    const p = list.find(it => it.id == card.dataset.id);
                    Quotes.renderConfigurator(p);
                };
            });
        };

        Quotes.renderConfigurator = (p) => {
            const area = document.getElementById('ai-configurator-area');
            const variationsHtml = p.variations && p.variations.length > 0 
                ? p.variations.map(group => {
                    const isQty = group.name.toUpperCase().includes('QUANTIDADE');
                    return `
                        <div class="config-group mt-8 first:mt-0 text-left animate-in slide-in-from-bottom-2 duration-300">
                            <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
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
                : `<div class="p-12 text-center opacity-40 italic">Este produto não possui configurações extras.</div>`;

            area.innerHTML = `
                <div class="flex items-center gap-8 p-10 rounded-[32px] bg-slate-900 text-white mb-10 shadow-2xl shadow-slate-200">
                    <div class="w-24 h-24 rounded-2xl overflow-hidden bg-white/10 p-1 flex-shrink-0">
                        <img src="${p.image || 'https://via.placeholder.com/200'}" class="w-full h-full object-cover rounded-xl">
                    </div>
                    <div>
                        <p class="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2">Configurando Produto</p>
                        <h4 class="text-3xl font-black tracking-tighter leading-none">${p.name}</h4>
                    </div>
                </div>
                <div class="config-section">${variationsHtml}</div>
                <div class="h-32"></div> <!-- Spacer para o footer -->
            `;

            // Ativar seleção
            area.querySelectorAll('.config-card').forEach(card => {
                card.onclick = () => {
                    const group = card.closest('.config-group');
                    group.querySelectorAll('.config-card').forEach(c => c.classList.remove('card-active', 'border-primary', 'bg-indigo-50/50'));
                    card.classList.add('card-active', 'border-primary', 'bg-indigo-50/50');
                    card.querySelector('input').checked = true;
                    Quotes.updateCatalogPrice(p);
                };
            });

            Quotes.updateCatalogPrice(p);
        };

        Quotes.updateCatalogPrice = (p) => {
            let total = p.price;
            document.querySelectorAll('.config-card.card-active').forEach(c => {
                total += parseFloat(c.dataset.cost || 0);
            });
            document.getElementById('catalog-total-price').innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        };

        Quotes.updateItemsUI = () => {
            const container = document.getElementById('items-list-container');
            const summary = document.getElementById('summary-items-list');
            const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            document.getElementById('items-count-tag').innerText = `${Quotes.currentItems.length} ITENS`;

            if (Quotes.currentItems.length === 0) {
                container.innerHTML = `<div class="p-16 text-center border-2 border-dashed border-slate-200 rounded-[32px] opacity-20 flex flex-col items-center gap-2">
                    <span class="material-symbols-outlined text-4xl">shopping_basket</span>
                    <p class="text-sm font-black italic">O pedido está vazio...</p>
                </div>`;
                summary.innerHTML = '';
            } else {
                container.innerHTML = Quotes.currentItems.map((it, idx) => `
                    <div class="bg-white p-6 rounded-[24px] border border-slate-100 flex items-center gap-6 group hover:border-primary transition-all animate-in slide-in-from-right-4 duration-300 shadow-sm">
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
                        <button onclick="window.removeItem(${idx})" class="w-10 h-10 rounded-full text-slate-200 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center">
                            <span class="material-symbols-outlined !text-[20px]">delete</span>
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

        Quotes.closeModal = () => {
            itemModal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        };

        // --- BINDINGS ---
        
        ['q-shipping', 'q-urgency', 'q-install', 'q-discount'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', Quotes.calculateFinalTotal);
        });

        document.getElementById('close-item-modal').onclick = Quotes.closeModal;
        document.getElementById('btn-cancel-catalog').onclick = Quotes.closeModal;
        
        document.getElementById('btn-save-quote').onclick = () => {
            const customerName = document.getElementById('q-customer').value;
            if (!customerName || Quotes.currentItems.length === 0) {
                import('../app.js').then(m => m.default.toast('Preencha o cliente e adicione itens!', 'warning'));
                return;
            }
            const subtotal = Quotes.currentItems.reduce((acc, it) => acc + it.total, 0);
            const extras = (parseFloat(document.getElementById('q-shipping').value) || 0) + (parseFloat(document.getElementById('q-urgency').value) || 0) + (parseFloat(document.getElementById('q-install').value) || 0);
            const discount = parseFloat(document.getElementById('q-discount').value) || 0;
            const newQuote = { id: `ORC-${Math.floor(1000 + Math.random() * 9000)}`, date: new Date().toLocaleDateString('pt-BR'), customerName, whatsapp: document.getElementById('q-whatsapp').value, items: [...Quotes.currentItems], value: subtotal + extras - discount, status: 'Pendente' };
            const q = DB.get('quotes') || [];
            q.unshift(newQuote);
            DB.save('quotes', q);
            import('../app.js').then(m => { m.default.toast('Orçamento finalizado!', 'success'); Quotes.render(container); });
        };

        // --- HISTÓRICO ---
        
        document.getElementById('btn-history').onclick = () => {
            const overlay = document.getElementById('quotes-list-overlay');
            overlay.classList.remove('hidden');
            Quotes.renderList();
        };

        document.getElementById('btn-back-to-quotes').onclick = () => {
            document.getElementById('quotes-list-overlay').classList.add('hidden');
        };

        Quotes.renderList = () => {
            const target = document.getElementById('list-target-area');
            const quotes = DB.get('quotes') || [];
            const fmt = (v) => parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            target.innerHTML = `
                <div class="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 border-b">
                                <th class="px-8 py-5">Proposta / Data</th>
                                <th class="px-8 py-5">Cliente</th>
                                <th class="px-8 py-5">Resumo</th>
                                <th class="px-8 py-5 text-right">Valor Total</th>
                                <th class="px-8 py-5 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${quotes.length === 0 ? `<tr><td colspan="5" class="p-32 text-center opacity-20 italic font-black">Nenhum orçamento arquivado.</td></tr>` : quotes.map(q => `
                                <tr class="hover:bg-slate-50/80 transition-all">
                                    <td class="px-8 py-6">
                                        <p class="text-sm font-black text-primary">${q.id}</p>
                                        <p class="text-[9px] font-bold text-slate-400 uppercase">${q.date}</p>
                                    </td>
                                    <td class="px-8 py-6">
                                        <p class="text-sm font-black text-slate-700">${q.customerName}</p>
                                        <span class="badge ${q.status === 'Aprovado' ? 'badge-green' : 'badge-purple'}">${q.status}</span>
                                    </td>
                                    <td class="px-8 py-6 max-w-[300px]">
                                        <p class="text-[10px] font-bold text-slate-400 truncate">${(q.items || []).map(it => it.name).join(', ')}</p>
                                    </td>
                                    <td class="px-8 py-6 text-right font-black text-lg text-slate-800">${fmt(q.value)}</td>
                                    <td class="px-8 py-6 text-center">
                                        <button onclick="window.shareQuote('${q.id}')" class="p-3 text-emerald-500 hover:bg-emerald-50 rounded-2xl transition-all" title="Enviar WhatsApp"><span class="material-symbols-outlined">share</span></button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        };

        // Busca no catálogo
        document.getElementById('ai-catalog-search')?.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = products.filter(p => p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term));
            Quotes.renderProductList(filtered);
        });
    }
};

export default Quotes;
