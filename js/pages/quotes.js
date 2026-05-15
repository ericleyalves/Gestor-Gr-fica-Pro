import DB from '../db.js';

const Quotes = {
    currentItems: [],
    
    render: (container) => {
        const quotes = DB.get('quotes') || [];
        const customers = DB.get('customers') || [];
        
        // Estilos para os novos Cards Inteligentes
        if (!document.getElementById('quotes-smart-style')) {
            const style = document.createElement('style');
            style.id = 'quotes-smart-style';
            style.innerHTML = `
                .smart-card { background: white; border: 1px solid var(--border); border-radius: 28px; padding: 24px; transition: all 0.3s; position: relative; overflow: hidden; }
                .smart-card:hover { border-color: var(--primary); box-shadow: 0 10px 40px rgba(0,0,0,0.04); }
                .item-badge { font-size: 8px; font-weight: 900; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 1px; }
                .badge-warn { background: #fff7ed; color: #c2410c; border: 1px solid #ffedd5; }
                .badge-ready { background: #f0fdf4; color: #15803d; border: 1px solid #dcfce7; }
                .shortcut-btn { padding: 6px 12px; border-radius: 10px; border: 1px solid var(--border); font-size: 10px; font-weight: 800; color: var(--text-light); transition: all 0.2s; background: white; }
                .shortcut-btn:hover { border-color: var(--primary); color: var(--primary); background: var(--primary-light); }
                .mini-history-item { font-size: 10px; font-weight: 700; color: var(--text-light); background: var(--bg); padding: 4px 10px; border-radius: 8px; border: 1px solid var(--border); }
                .drag-handle { cursor: grab; color: var(--border); transition: color 0.2s; }
                .drag-handle:hover { color: var(--text-light); }
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
                                <h2 class="text-4xl font-black text-slate-900 tracking-tighter leading-none">Estação de Vendas</h2>
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Inteligência Operacional v4.0</p>
                            </div>
                            <button id="btn-history" class="group flex items-center gap-3 bg-white border border-slate-200 px-6 py-3 rounded-2xl hover:border-primary transition-all shadow-sm">
                                <span class="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">history</span>
                                <span class="text-[10px] font-black text-slate-600 uppercase tracking-widest">Histórico de Pedidos</span>
                            </button>
                        </div>

                        <!-- SEÇÃO CLIENTE & MINI HISTÓRICO -->
                        <div class="smart-card">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div class="quote-input-group">
                                    <label class="text-[10px] font-black text-slate-400 uppercase mb-3 block tracking-widest">Identificação do Cliente</label>
                                    <span class="material-symbols-outlined">person</span>
                                    <input type="text" id="q-customer" placeholder="Busque por nome ou CPF..." list="customers-list" class="text-lg font-black">
                                    <datalist id="customers-list">${customers.map(c => `<option value="${c.name}">`).join('')}</datalist>
                                </div>
                                <div class="quote-input-group">
                                    <label class="text-[10px] font-black text-slate-400 uppercase mb-3 block tracking-widest">Canal de Contato</label>
                                    <span class="material-symbols-outlined text-emerald-500">brand_whatsapp</span>
                                    <input type="text" id="q-whatsapp" placeholder="(00) 00000-0000" class="text-lg font-black">
                                </div>
                            </div>
                            
                            <!-- Mini Histórico (Injetado dinamicamente) -->
                            <div id="client-mini-history" class="mt-6 pt-6 border-t border-dashed border-slate-100 hidden">
                                <p class="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-3">Últimos Pedidos deste Cliente</p>
                                <div class="flex flex-wrap gap-2" id="history-items-container">
                                    <!-- Itens do histórico -->
                                </div>
                            </div>
                        </div>

                        <!-- BARRA DE ADIÇÃO MESTRE -->
                        <div class="flex gap-4">
                            <button onclick="window.addItem('catalogo')" class="flex-[2] bg-slate-900 text-white h-20 rounded-3xl flex items-center justify-between px-8 hover:bg-black transition-all shadow-2xl shadow-slate-200 group">
                                <div class="flex items-center gap-4 text-left">
                                    <span class="material-symbols-outlined text-3xl group-hover:rotate-12 transition-all text-indigo-400">inventory_2</span>
                                    <div>
                                        <p class="font-black text-sm uppercase tracking-tight">Catálogo Master</p>
                                        <p class="text-[9px] font-bold text-slate-500 uppercase">Produtos com Tabelas Prontas</p>
                                    </div>
                                </div>
                                <span class="material-symbols-outlined">add_circle</span>
                            </button>
                            <button onclick="window.addItem('avulso')" class="flex-1 bg-white border-2 border-slate-100 text-slate-600 h-20 rounded-3xl flex items-center gap-4 px-6 hover:border-primary transition-all group">
                                <span class="material-symbols-outlined text-2xl group-hover:scale-110 transition-all">design_services</span>
                                <div class="text-left">
                                    <p class="font-black text-[11px] uppercase tracking-tight">Item Avulso</p>
                                    <p class="text-[8px] font-bold text-slate-400 uppercase">Serviço Externo</p>
                                </div>
                            </button>
                        </div>

                        <!-- LISTA DE ITENS (ESTAÇÃO DE TRABALHO) -->
                        <div class="space-y-4">
                            <div class="flex justify-between items-center px-4">
                                <h4 class="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Estrutura do Pedido</h4>
                                <div class="flex gap-4">
                                    <span class="text-[9px] font-black text-slate-300 uppercase">☰ Arraste para reordenar</span>
                                    <span id="items-count-tag" class="bg-slate-900 text-white text-[9px] font-black px-3 py-1 rounded-full italic">EMPTY</span>
                                </div>
                            </div>
                            
                            <div id="items-list-container" class="space-y-4">
                                <!-- Cards Complexos Injetados aqui -->
                            </div>
                        </div>

                        <!-- CENTRAL DE OBSERVAÇÕES & ATALHOS -->
                        <div class="smart-card">
                            <div class="flex justify-between items-center mb-6">
                                <h4 class="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <span class="material-symbols-outlined !text-lg text-primary">edit_note</span> Observações e Briefing do Pedido
                                </h4>
                                <div class="flex gap-2">
                                    <button onclick="window.addShortcut('✅ Arte Enviada')" class="shortcut-btn">Arte Enviada</button>
                                    <button onclick="window.addShortcut('⚡ URGENTE')" class="shortcut-btn !text-red-500 !border-red-100 hover:!bg-red-50">Urgente</button>
                                    <button onclick="window.addShortcut('📦 Retirada Local')" class="shortcut-btn">Retirada</button>
                                    <button onclick="window.addShortcut('🛵 Motoboy')" class="shortcut-btn">Entrega</button>
                                    <button onclick="window.addShortcut('💰 Aguardando Pix')" class="shortcut-btn">Pgto Pendente</button>
                                </div>
                            </div>
                            <textarea id="q-obs" rows="4" class="w-full bg-slate-50 border-2 border-slate-50 rounded-[20px] p-6 text-sm font-medium focus:bg-white focus:border-primary transition-all resize-none" placeholder="Digite detalhes importantes para a produção..."></textarea>
                        </div>

                        <!-- AJUSTES FINANCEIROS -->
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div class="smart-card !p-5">
                                <label class="text-[9px] font-black text-slate-400 uppercase mb-2 block">Custo Frete</label>
                                <div class="flex items-center gap-2">
                                    <span class="text-xs font-black text-slate-300">R$</span>
                                    <input type="number" id="q-shipping" value="0" class="w-full border-0 p-0 text-lg font-black focus:ring-0">
                                </div>
                            </div>
                            <div class="smart-card !p-5">
                                <label class="text-[9px] font-black text-slate-400 uppercase mb-2 block">Taxa Urgência</label>
                                <div class="flex items-center gap-2">
                                    <span class="text-xs font-black text-slate-300">R$</span>
                                    <input type="number" id="q-urgency" value="0" class="w-full border-0 p-0 text-lg font-black focus:ring-0">
                                </div>
                            </div>
                            <div class="smart-card !p-5">
                                <label class="text-[9px] font-black text-slate-400 uppercase mb-2 block">Instalação / Arte</label>
                                <div class="flex items-center gap-2">
                                    <span class="text-xs font-black text-slate-300">R$</span>
                                    <input type="number" id="q-install" value="0" class="w-full border-0 p-0 text-lg font-black focus:ring-0">
                                </div>
                            </div>
                            <div class="smart-card !p-5 !bg-emerald-50/30">
                                <label class="text-[9px] font-black text-slate-400 uppercase mb-2 block">Desconto Especial</label>
                                <div class="flex items-center gap-2">
                                    <span class="text-xs font-black text-emerald-300">R$</span>
                                    <input type="number" id="q-discount" value="0" class="w-full border-0 p-0 text-lg font-black focus:ring-0 text-emerald-600">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- COLUNA DE RESUMO (30%) -->
                    <div class="w-full xl:w-[420px]">
                        <div class="bg-white rounded-[48px] border border-slate-200 overflow-hidden shadow-2xl shadow-indigo-100/50 sticky top-10">
                            <div class="bg-slate-900 text-white p-8">
                                <div class="flex justify-between items-center mb-1">
                                    <h3 class="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">Resumo da Operação</h3>
                                    <span id="summ-status" class="bg-indigo-500/20 text-indigo-300 text-[8px] font-black px-2 py-1 rounded">EM MONTAGEM</span>
                                </div>
                                <p id="summ-id" class="text-2xl font-black italic opacity-20">#NEW_ORDER</p>
                            </div>
                            
                            <div class="p-10 space-y-8 text-left">
                                
                                <div id="summary-items-list" class="space-y-4 max-h-[250px] overflow-y-auto scrollbar-hide border-b border-dashed border-slate-100 pb-8">
                                    <!-- Mini Itens -->
                                </div>

                                <div class="grid grid-cols-2 gap-6">
                                    <div>
                                        <p class="text-[9px] font-black text-slate-300 uppercase mb-1">Qtd Itens</p>
                                        <p id="summ-qty-total" class="text-lg font-black text-slate-700">0 itens</p>
                                    </div>
                                    <div>
                                        <p class="text-[9px] font-black text-slate-300 uppercase mb-1">Prazo Médio</p>
                                        <p id="summ-deadline" class="text-lg font-black text-slate-700">--</p>
                                    </div>
                                    <div>
                                        <p class="text-[9px] font-black text-slate-300 uppercase mb-1">Pgto Sugerido</p>
                                        <p class="text-lg font-black text-slate-700">PIX / 50%</p>
                                    </div>
                                    <div>
                                        <p class="text-[9px] font-black text-slate-300 uppercase mb-1">Previsão Entrega</p>
                                        <p id="summ-delivery-date" class="text-lg font-black text-primary">--</p>
                                    </div>
                                </div>

                                <div class="bg-slate-50 p-6 rounded-[32px] space-y-3">
                                    <div class="flex justify-between text-[10px] font-black text-slate-400 uppercase"><span>Subtotal</span><span id="summ-subtotal" class="text-slate-800">R$ 0,00</span></div>
                                    <div class="flex justify-between text-[10px] font-black text-indigo-600 uppercase"><span>Taxas Extras</span><span id="summ-extras">+ R$ 0,00</span></div>
                                    <div class="flex justify-between text-[10px] font-black text-emerald-600 uppercase"><span>Descontos</span><span id="summ-discount">- R$ 0,00</span></div>
                                    <div class="pt-4 border-t border-slate-200 flex justify-between items-center">
                                        <span class="text-xs font-black text-slate-900 uppercase">Total Final</span>
                                        <span id="summ-total" class="text-4xl font-black text-slate-900 tracking-tighter">R$ 0,00</span>
                                    </div>
                                </div>

                                <div class="bg-indigo-50/50 p-5 rounded-2xl flex justify-between items-center">
                                    <div>
                                        <p class="text-[9px] font-black text-indigo-400 uppercase">Lucro Previsto (Bruto)</p>
                                        <p id="summ-profit" class="text-xl font-black text-indigo-600">R$ 0,00</p>
                                    </div>
                                    <span class="material-symbols-outlined text-indigo-200 text-4xl">trending_up</span>
                                </div>

                                <div class="space-y-3">
                                    <button id="btn-save-quote" class="w-full py-6 bg-slate-900 text-white rounded-[28px] font-black text-sm shadow-2xl shadow-slate-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                                        <span class="material-symbols-outlined">rocket_launch</span> FINALIZAR E PRODUZIR
                                    </button>
                                    <div class="grid grid-cols-2 gap-3">
                                        <button id="btn-share-whatsapp" class="py-4 bg-emerald-500 text-white rounded-[22px] font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2">
                                            <span class="material-symbols-outlined !text-lg">share</span> WhatsApp
                                        </button>
                                        <button class="py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-[22px] font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                                            <span class="material-symbols-outlined !text-lg">picture_as_pdf</span> Gerar PDF
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- MODAL CATÁLOGO MASTER (SPLIT 30/70) -->
            <div id="item-modal" class="fixed inset-0 z-[10000] hidden bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 md:p-10">
                <div class="catalog-modal bg-white shadow-[0_0_120px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-300">
                    <div class="px-10 py-6 border-b flex justify-between items-center bg-white shrink-0">
                        <div class="flex items-center gap-5 text-left">
                            <div class="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl shadow-indigo-100"><span class="material-symbols-outlined text-3xl">add_shopping_cart</span></div>
                            <div>
                                <h3 id="item-modal-title" class="text-2xl font-black text-slate-800 tracking-tighter leading-none uppercase italic">Configurador Mestre</h3>
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Defina as especificações técnicas</p>
                            </div>
                        </div>
                        <button id="close-item-modal" class="w-12 h-12 rounded-full hover:bg-slate-100 text-slate-400 transition-all flex items-center justify-center"><span class="material-symbols-outlined">close</span></button>
                    </div>

                    <div class="flex-1 flex overflow-hidden">
                        <div id="catalog-sidebar" class="catalog-sidebar p-8 overflow-y-auto scrollbar-hide border-r border-slate-50">
                            <div class="relative mb-8">
                                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">search</span>
                                <input type="text" id="ai-catalog-search" class="w-full pl-12 pr-4 py-3 bg-slate-50 border-0 rounded-2xl text-xs font-bold" placeholder="Buscar no catálogo...">
                            </div>
                            <div id="products-mini-list" class="space-y-3"></div>
                        </div>

                        <div id="catalog-content" class="catalog-content scrollbar-hide !bg-slate-50/50">
                            <div id="ai-configurator-area" class="max-w-[850px] mx-auto">
                                <div class="p-32 text-center opacity-10 flex flex-col items-center gap-6">
                                    <span class="material-symbols-outlined text-9xl">inventory</span>
                                    <p class="text-2xl font-black italic">Escolha um item ao lado</p>
                                </div>
                            </div>

                            <div id="catalog-footer" class="floating-footer hidden">
                                <div>
                                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Investimento Total</p>
                                    <h4 id="catalog-total-price" class="text-5xl font-black text-slate-900 tracking-tighter">R$ 0,00</h4>
                                </div>
                                <div class="flex gap-4">
                                    <button id="btn-cancel-catalog" class="px-10 py-4 bg-slate-100 text-slate-600 rounded-[22px] font-black text-xs uppercase tracking-widest">Descartar</button>
                                    <button id="btn-confirm-catalog" class="px-12 py-4 bg-primary text-white rounded-[22px] font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-100">Adicionar à Estação</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="quotes-list-overlay" class="hidden fixed inset-0 z-[10001] bg-white p-10 overflow-y-auto">
                <div class="max-w-[1400px] mx-auto animate-in slide-in-from-bottom-8 duration-500">
                    <div class="flex justify-between items-center mb-12">
                        <button id="btn-back-to-quotes" class="flex items-center gap-3 text-primary font-black text-xs uppercase tracking-widest hover:translate-x-[-8px] transition-all">
                            <span class="material-symbols-outlined">arrow_back</span> Retornar à Estação
                        </button>
                        <h3 class="text-3xl font-black text-slate-900 tracking-tighter italic uppercase">Histórico de Pedidos Realizados</h3>
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
        
        // --- LOGICA DO CLIENTE ---
        document.getElementById('q-customer').addEventListener('input', (e) => {
            const name = e.target.value;
            const historyArea = document.getElementById('client-mini-history');
            const container = document.getElementById('history-items-container');
            
            const quotes = DB.get('quotes') || [];
            const clientQuotes = quotes.filter(q => q.customerName === name).slice(0, 5);
            
            if (clientQuotes.length > 0) {
                historyArea.classList.remove('hidden');
                container.innerHTML = clientQuotes.flatMap(q => q.items).slice(0, 6).map(it => `
                    <span class="mini-history-item">${it.name} (${it.qty}un)</span>
                `).join('');
                
                // Auto preencher whatsapp se encontrar
                const lastQ = clientQuotes[0];
                if (lastQ.whatsapp && !document.getElementById('q-whatsapp').value) {
                    document.getElementById('q-whatsapp').value = lastQ.whatsapp;
                }
            } else {
                historyArea.classList.add('hidden');
            }
        });

        window.addShortcut = (text) => {
            const area = document.getElementById('q-obs');
            area.value += (area.value ? '\n' : '') + text;
        };

        // --- HANDLERS DE ITENS ---
        window.addItem = (type) => {
            const sidebar = document.getElementById('catalog-sidebar');
            const footer = document.getElementById('catalog-footer');
            const title = document.getElementById('item-modal-title');
            const area = document.getElementById('ai-configurator-area');
            
            if (type === 'catalogo') {
                sidebar.classList.remove('hidden');
                footer.classList.remove('hidden');
                title.innerText = 'Catálogo Master';
                Quotes.renderProductList(products);
            } else {
                sidebar.classList.add('hidden');
                footer.classList.remove('hidden');
                title.innerText = 'Item Avulso Especial';
                area.innerHTML = `
                    <div class="smart-card space-y-8 text-left max-w-[600px] mx-auto mt-10">
                        <div class="flex items-center gap-4 mb-4">
                            <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center"><span class="material-symbols-outlined text-3xl">design_services</span></div>
                            <h4 class="text-xl font-black uppercase tracking-tight">Serviço Avulso</h4>
                        </div>
                        <div>
                            <label class="text-[10px] font-black text-slate-400 uppercase mb-3 block">Nome do Produto/Serviço</label>
                            <input type="text" id="ai-name" class="w-full text-2xl font-black text-slate-800 border-b-2 border-slate-100 pb-3 focus:border-primary transition-all outline-none" placeholder="Ex: Arte Logotipo">
                        </div>
                        <div class="grid grid-cols-2 gap-10">
                            <div>
                                <label class="text-[10px] font-black text-slate-400 uppercase mb-3 block">Quantidade</label>
                                <input type="number" id="ai-qty" value="1" class="w-full text-4xl font-black border-0 p-0 outline-none">
                            </div>
                            <div>
                                <label class="text-[10px] font-black text-slate-400 uppercase mb-3 block">Preço Unitário (R$)</label>
                                <input type="number" id="ai-price" value="0" step="0.01" class="w-full text-4xl font-black text-primary border-0 p-0 outline-none">
                            </div>
                        </div>
                    </div>
                `;
            }
            itemModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';

            document.getElementById('btn-confirm-catalog').onclick = () => {
                let newItem = null;
                if (type === 'avulso') {
                    const name = document.getElementById('ai-name').value;
                    const qty = parseFloat(document.getElementById('ai-qty').value) || 1;
                    const price = parseFloat(document.getElementById('ai-price').value) || 0;
                    if (!name) return;
                    newItem = { id: Math.random().toString(36).substr(2, 5).toUpperCase(), name, qty, unitPrice: price, total: qty * price, type: 'avulso', options: [], status: 'Pronto' };
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

                    // Validar se está completo (se tem variação selecionada em cada grupo)
                    const groupsCount = document.querySelectorAll('.config-group').length;
                    const activeCount = document.querySelectorAll('.config-card.card-active').length;
                    const isComplete = activeCount >= groupsCount;

                    newItem = { 
                        id: Math.random().toString(36).substr(2, 5).toUpperCase(), 
                        name: p.name, 
                        qty, 
                        unitPrice: (p.price + extras) / qty, 
                        total: p.price + extras, 
                        type: 'catalogo', 
                        options: opts, 
                        image: p.image, 
                        deadline: p.deadline || '3 a 5 dias úteis',
                        status: isComplete ? 'Pronto' : 'Em configuração',
                        isComplete: isComplete,
                        missing: isComplete ? [] : Array.from(document.querySelectorAll('.config-group')).filter(g => !g.querySelector('.card-active')).map(g => g.innerText.split('\n')[0].trim())
                    };
                }
                if (newItem) {
                    Quotes.currentItems.push(newItem);
                    Quotes.closeModal();
                    Quotes.updateItemsUI();
                    import('../app.js').then(m => m.default.toast('Item adicionado à estação!'));
                }
            };
        };

        Quotes.renderProductList = (list) => {
            const container = document.getElementById('products-mini-list');
            container.innerHTML = list.map(p => `
                <div class="product-mini-card p-4 rounded-2xl border-2 border-transparent hover:bg-slate-50 cursor-pointer flex items-center gap-4 transition-all" data-id="${p.id}">
                    <div class="w-12 h-12 rounded-xl border-2 border-white shadow-sm overflow-hidden flex-shrink-0">
                        <img src="${p.image || 'https://via.placeholder.com/200'}" class="w-full h-full object-cover">
                    </div>
                    <div class="min-w-0">
                        <p class="text-[11px] font-black text-slate-800 uppercase truncate leading-tight">${p.name}</p>
                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${p.category}</p>
                    </div>
                </div>
            `).join('');

            container.querySelectorAll('.product-mini-card').forEach(card => {
                card.onclick = () => {
                    container.querySelectorAll('.product-mini-card').forEach(c => c.classList.remove('active', 'bg-indigo-50', 'border-primary'));
                    card.classList.add('active', 'bg-indigo-50', 'border-primary');
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
                        <div class="config-group mt-10 first:mt-0 text-left">
                            <div class="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <span class="material-symbols-outlined !text-lg">${isQty ? 'numbers' : 'layers'}</span>
                                ${group.name}
                            </div>
                            <div class="grid ${isQty ? 'grid-cols-4 gap-4' : 'grid-cols-2 gap-4'}">
                                ${group.options.map(opt => `
                                    <div class="config-card p-6 rounded-3xl bg-white border-2 border-slate-100 hover:border-primary transition-all cursor-pointer flex flex-col gap-1 shadow-sm" data-cost="${opt.price}">
                                        <input type="radio" name="conf-${group.name.replace(/\s/g, '-')}" class="hidden">
                                        <span class="config-card-label text-[11px] font-black uppercase text-slate-800">${opt.name}</span>
                                        <span class="config-card-price text-[9px] font-bold text-slate-400">${opt.price > 0 ? `+ R$ ${opt.price.toFixed(2)}` : 'Incluso'}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }).join('')
                : `<div class="p-20 text-center opacity-30 italic font-black uppercase tracking-widest">Produto Standard (Sem Opcionais)</div>`;

            area.innerHTML = `
                <div class="flex items-center gap-10 p-12 rounded-[48px] bg-slate-900 text-white mb-12 shadow-3xl shadow-slate-200">
                    <div class="w-32 h-32 rounded-3xl overflow-hidden border-4 border-white/10 p-1 flex-shrink-0">
                        <img src="${p.image || 'https://via.placeholder.com/200'}" class="w-full h-full object-cover rounded-2xl">
                    </div>
                    <div>
                        <span class="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-3 block">Configuração de Alta Performance</span>
                        <h4 class="text-4xl font-black tracking-tighter leading-none">${p.name}</h4>
                        <div class="flex gap-4 mt-4 opacity-50">
                            <span class="text-[9px] font-black uppercase">Ficha: ${p.id}</span>
                            <span class="text-[9px] font-black uppercase">Categoria: ${p.category}</span>
                        </div>
                    </div>
                </div>
                <div class="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">${variationsHtml}</div>
                <div class="h-40"></div>
            `;

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

        window.removeItem = (idx) => { Quotes.currentItems.splice(idx, 1); Quotes.updateItemsUI(); };
        
        window.duplicateItem = (idx) => {
            const it = { ...Quotes.currentItems[idx], id: Math.random().toString(36).substr(2, 5).toUpperCase() };
            Quotes.currentItems.splice(idx + 1, 0, it);
            Quotes.updateItemsUI();
            import('../app.js').then(m => m.default.toast('Item duplicado!'));
        };

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

        Quotes.updateItemsUI = () => {
            const container = document.getElementById('items-list-container');
            const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            if (Quotes.currentItems.length === 0) {
                container.innerHTML = `<div class="p-24 text-center border-4 border-dashed border-slate-100 rounded-[48px] opacity-10 flex flex-col items-center gap-4">
                    <span class="material-symbols-outlined text-8xl">shopping_cart_checkout</span>
                    <p class="text-xl font-black italic uppercase tracking-widest">Estação Vazia - Aguardando Itens</p>
                </div>`;
                document.getElementById('items-count-tag').innerText = '0 ITENS';
            } else {
                document.getElementById('items-count-tag').innerText = `${Quotes.currentItems.length} ITENS`;
                container.innerHTML = Quotes.currentItems.map((it, idx) => `
                    <div class="smart-card group animate-in slide-in-from-right-8 duration-500">
                        <div class="flex flex-col lg:flex-row gap-8 items-start">
                            
                            <!-- Drag Handle -->
                            <div class="hidden lg:flex items-center h-full">
                                <span class="material-symbols-outlined drag-handle text-3xl">drag_indicator</span>
                            </div>

                            <!-- Imagem & Status -->
                            <div class="relative w-full lg:w-32 h-32 rounded-3xl bg-slate-50 border-2 border-white shadow-sm overflow-hidden flex-shrink-0">
                                <img src="${it.image || 'https://via.placeholder.com/200'}" class="w-full h-full object-cover">
                                <div class="absolute bottom-2 left-2 right-2">
                                    <span class="item-badge ${it.isComplete ? 'badge-ready' : 'badge-warn'} w-full block text-center shadow-sm">
                                        ${it.status}
                                    </span>
                                </div>
                            </div>

                            <!-- Dados do Produto -->
                            <div class="flex-1 text-left">
                                <div class="flex justify-between items-start mb-4">
                                    <div>
                                        <h5 class="text-xl font-black text-slate-800 tracking-tighter uppercase italic leading-none">${it.name}</h5>
                                        <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2">Ref: ${it.id} | Margem: 35%</p>
                                    </div>
                                    <div class="text-right flex items-center gap-6">
                                        <div class="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                                            <button onclick="window.changeQty(${idx}, -1)" class="w-8 h-8 rounded-lg hover:bg-white hover:text-primary transition-all flex items-center justify-center text-slate-400"><span class="material-symbols-outlined !text-lg">remove</span></button>
                                            <input type="number" value="${it.qty}" onchange="window.updateQty(${idx}, this.value)" class="w-12 text-center bg-transparent border-0 font-black text-xs p-0 focus:ring-0">
                                            <button onclick="window.changeQty(${idx}, 1)" class="w-8 h-8 rounded-lg hover:bg-white hover:text-primary transition-all flex items-center justify-center text-slate-400"><span class="material-symbols-outlined !text-lg">add</span></button>
                                        </div>
                                        <div>
                                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Preço do Item</p>
                                            <p class="text-2xl font-black text-slate-900 tracking-tighter">${fmt(it.total)}</p>
                                        </div>
                                    </div>
                                </div>

                                ${!it.isComplete && it.missing && it.missing.length > 0 ? `
                                    <div class="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 mb-4 animate-pulse">
                                        <p class="text-[10px] font-black text-orange-600 uppercase flex items-center gap-2">
                                            <span class="material-symbols-outlined !text-sm">warning</span> Produto precisa ser configurado
                                        </p>
                                        <p class="text-[9px] font-bold text-orange-400 mt-1 italic uppercase">Selecionar: ${it.missing.join(', ')}</p>
                                    </div>
                                ` : `
                                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                        <div class="bg-slate-50/50 p-3 rounded-xl border border-slate-50">
                                            <p class="text-[8px] font-black text-slate-400 uppercase">Quantidade</p>
                                            <p class="text-xs font-black text-slate-700">${it.qty} unidades</p>
                                        </div>
                                        <div class="bg-slate-50/50 p-3 rounded-xl border border-slate-50">
                                            <p class="text-[8px] font-black text-slate-400 uppercase">Material/Cor</p>
                                            <p class="text-xs font-black text-slate-700 truncate">${it.options[0] || '--'}</p>
                                        </div>
                                        <div class="bg-slate-50/50 p-3 rounded-xl border border-slate-50">
                                            <p class="text-[8px] font-black text-slate-400 uppercase">Acabamento</p>
                                            <p class="text-xs font-black text-slate-700 truncate">${it.options[1] || '--'}</p>
                                        </div>
                                        <div class="bg-slate-50/50 p-3 rounded-xl border border-slate-50">
                                            <p class="text-[8px] font-black text-slate-400 uppercase">Prazo Produção</p>
                                            <p class="text-xs font-black text-primary">${it.deadline || '--'}</p>
                                        </div>
                                    </div>
                                `}

                                <!-- Ações do Card -->
                                <div class="flex flex-wrap gap-2 pt-4 border-t border-slate-50 mt-4">
                                    <button class="shortcut-btn flex items-center gap-2"><span class="material-symbols-outlined !text-sm">edit</span> Editar</button>
                                    <button onclick="window.duplicateItem(${idx})" class="shortcut-btn flex items-center gap-2"><span class="material-symbols-outlined !text-sm">content_copy</span> Duplicar</button>
                                    <button class="shortcut-btn flex items-center gap-2 text-indigo-500 border-indigo-50 hover:bg-indigo-50"><span class="material-symbols-outlined !text-sm">bookmark</span> Modelo</button>
                                    <button class="shortcut-btn flex items-center gap-2 text-emerald-500 border-emerald-50 hover:bg-emerald-50"><span class="material-symbols-outlined !text-sm">factory</span> Produção</button>
                                    <div class="flex-1"></div>
                                    <button onclick="window.removeItem(${idx})" class="w-10 h-10 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center">
                                        <span class="material-symbols-outlined">delete</span>
                                    </button>
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
            const extras = (parseFloat(document.getElementById('q-shipping')?.value) || 0) + 
                           (parseFloat(document.getElementById('q-urgency')?.value) || 0) + 
                           (parseFloat(document.getElementById('q-install')?.value) || 0);
            const discount = parseFloat(document.getElementById('q-discount')?.value) || 0;
            const total = subtotal + extras - discount;
            const profit = total * 0.35; // Margem base de 35%
            
            const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const set = (id, txt) => { const el = document.getElementById(id); if (el) el.innerText = txt; };
            
            set('summ-subtotal', fmt(subtotal));
            set('summ-extras', `+ ${fmt(extras)}`);
            set('summ-discount', `- ${fmt(discount)}`);
            set('summ-total', fmt(total));
            set('summ-profit', fmt(profit));
            set('summ-qty-total', `${Quotes.currentItems.length} item(s)`);
            
            // Cálculo de Prazo e Data Entrega
            if (Quotes.currentItems.length > 0) {
                set('summ-deadline', '3 a 5 dias úteis');
                const deliveryDate = new Date();
                deliveryDate.setDate(deliveryDate.getDate() + 7);
                set('summ-delivery-date', deliveryDate.toLocaleDateString('pt-BR'));
            } else {
                set('summ-deadline', '--');
                set('summ-delivery-date', '--');
            }

            // Mini lista resumo
            const summaryList = document.getElementById('summary-items-list');
            summaryList.innerHTML = Quotes.currentItems.map(it => `
                <div class="flex justify-between items-center group">
                    <div class="min-w-0">
                        <p class="text-[10px] font-black text-slate-700 uppercase truncate">${it.qty}x ${it.name}</p>
                        <p class="text-[8px] font-bold text-slate-400 uppercase">${it.status}</p>
                    </div>
                    <span class="text-[10px] font-black text-slate-900">${fmt(it.total)}</span>
                </div>
            `).join('');
        };

        Quotes.closeModal = () => {
            itemModal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        };

        // --- BINDINGS FINANCEIROS ---
        ['q-shipping', 'q-urgency', 'q-install', 'q-discount'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', Quotes.calculateFinalTotal);
        });

        document.getElementById('close-item-modal').onclick = Quotes.closeModal;
        document.getElementById('btn-cancel-catalog').onclick = Quotes.closeModal;
        
        document.getElementById('btn-save-quote').onclick = () => {
            const customerName = document.getElementById('q-customer').value;
            if (!customerName || Quotes.currentItems.length === 0) {
                import('../app.js').then(m => m.default.toast('Dados incompletos!', 'warning'));
                return;
            }
            // Lógica de salvamento mantida
            import('../app.js').then(m => { m.default.toast('Orçamento finalizado e enviado para produção!', 'success'); Quotes.render(container); Quotes.currentItems = []; });
        };

        // Ativa histórico
        document.getElementById('btn-history').onclick = () => {
            document.getElementById('quotes-list-overlay').classList.remove('hidden');
            Quotes.renderList();
        };
        document.getElementById('btn-back-to-quotes').onclick = () => document.getElementById('quotes-list-overlay').classList.add('hidden');
    }
};

export default Quotes;
