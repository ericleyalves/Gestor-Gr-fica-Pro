import DB from '../db.js';

const Quotes = {
    render: (container) => {
        const quotes    = DB.get('quotes')    || [];
        const customers = DB.get('customers') || [];

        const openCount    = quotes.filter(q => q.status === 'Aberto').length;
        const totalRevenue = quotes.reduce((s, q) => s + parseFloat(q.value || 0), 0);
        const fmtBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        container.innerHTML = `
            <div class="max-w-[1400px] mx-auto flex flex-col gap-5 page-enter">

                <!-- KPI Row -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    ${Quotes.kpi('Total de Orçamentos', quotes.length,    'request_quote', '#6C2BFF', '#F0EBFF')}
                    ${Quotes.kpi('Em Aberto',           openCount,         'hourglass_empty','#D97706','#FFFBEB')}
                    ${Quotes.kpi('Taxa de Conversão',   quotes.length > 0 ? Math.round(((quotes.length - openCount) / quotes.length) * 100) + '%' : '—', 'query_stats', '#059669', '#ECFDF5')}
                    ${Quotes.kpi('Valor Total',         fmtBRL(totalRevenue), 'payments', '#2563EB', '#EFF6FF')}
                </div>

                <!-- Action Bar -->
                <div class="action-bar">
                    <div class="search-input-wrap">
                        <span class="material-symbols-outlined">search</span>
                        <input type="text" id="quote-search" placeholder="Buscar por cliente, ID ou produto...">
                    </div>
                    <button id="btn-add-quote" class="btn-primary">
                        <span class="material-symbols-outlined" style="font-size:18px;">add</span>
                        Novo Orçamento
                    </button>
                </div>

                <!-- Table or Empty -->
                ${quotes.length === 0
                    ? `<div class="data-table">
                           <div class="empty-state">
                               <div class="empty-state-icon"><span class="material-symbols-outlined">request_quote</span></div>
                               <h3>Nenhum orçamento ainda</h3>
                               <p>Crie seu primeiro orçamento e comece a converter clientes em vendas.</p>
                               <button class="btn-primary" id="btn-add-quote-empty">Criar primeiro orçamento</button>
                           </div>
                       </div>`
                    : `<div class="data-table overflow-hidden">
                           <div class="overflow-x-auto">
                               <table class="w-full text-left border-collapse">
                                   <thead>
                                       <tr style="background:#FAFBFF; border-bottom:1px solid var(--border);">
                                           <th class="px-5 py-3 label-caps">ID / Data</th>
                                           <th class="px-5 py-3 label-caps">Cliente</th>
                                           <th class="px-5 py-3 label-caps">Produto</th>
                                           <th class="px-5 py-3 label-caps text-right">Valor</th>
                                           <th class="px-5 py-3 label-caps text-center">Status</th>
                                           <th class="px-5 py-3 label-caps text-center">Ações</th>
                                       </tr>
                                   </thead>
                                   <tbody>
                                       ${quotes.map(q => Quotes.renderRow(q, customers)).join('')}
                                   </tbody>
                               </table>
                           </div>
                       </div>`
                }
            </div>

            <!-- MODAL -->
            <div id="quote-modal" class="hidden fixed inset-0 z-[100] flex items-center justify-center p-4" style="background:rgba(10,10,20,0.5); backdrop-filter:blur(8px);">
                <div class="quote-modal-inner">

                    <!-- LEFT: Form 65% -->
                    <div class="flex flex-col min-w-0" style="flex:0 0 65%; border-right:1px solid var(--border);">

                        <!-- Modal Header -->
                        <div class="flex justify-between items-center px-6 py-4 border-b" style="border-color:var(--border);">
                            <div class="flex items-center gap-3">
                                <div class="section-icon flex-shrink-0"><span class="material-symbols-outlined">receipt_long</span></div>
                                <div>
                                    <h3 class="text-lg font-black" style="color:var(--text-main);letter-spacing:-0.02em;">Novo Orçamento</h3>
                                    <p class="text-xs" style="color:var(--text-faint);">Preencha os dados para gerar a proposta comercial.</p>
                                </div>
                            </div>
                            <button id="close-quote-modal" class="w-8 h-8 flex items-center justify-center rounded-full transition-all" style="color:var(--text-faint);" onmouseover="this.style.background='#F8F6FF'" onmouseout="this.style.background='transparent'">
                                <span class="material-symbols-outlined" style="font-size:18px;">close</span>
                            </button>
                        </div>

                        <!-- Form Body -->
                        <div class="flex-1 overflow-y-auto px-6 py-5" style="background:var(--bg-main);">
                            <form id="form-quote" class="space-y-4">

                                <!-- Cliente -->
                                <div class="section-card">
                                    <div class="section-header">
                                        <div class="section-icon"><span class="material-symbols-outlined">person</span></div>
                                        <h4 class="section-title">Dados do Cliente</h4>
                                    </div>
                                    <div class="grid grid-cols-2 gap-4">
                                        <div>
                                            <label>Nome / Prospect</label>
                                            <input type="text" id="q-customer" name="q-customer-search" placeholder="Ex: João Silva" required list="customers-list" autocomplete="new-password">
                                            <datalist id="customers-list">
                                                ${customers.map(c => `<option value="${c.name}">`).join('')}
                                            </datalist>
                                        </div>
                                        <div>
                                            <label>WhatsApp</label>
                                            <input type="text" id="q-whatsapp" placeholder="(00) 00000-0000">
                                        </div>
                                        <div>
                                            <label>Empresa</label>
                                            <input type="text" id="q-company" placeholder="Razão social">
                                        </div>
                                        <div>
                                            <label>Cidade / UF</label>
                                            <input type="text" id="q-city" placeholder="São Paulo - SP">
                                        </div>
                                    </div>
                                    <div class="mt-4">
                                        <label>Observações Técnicas</label>
                                        <textarea id="q-obs" rows="3" placeholder="Prazos, especificações de material, acabamentos..."></textarea>
                                    </div>
                                </div>

                                <!-- Produto -->
                                <div class="section-card">
                                    <div class="section-header">
                                        <div class="section-icon"><span class="material-symbols-outlined">inventory_2</span></div>
                                        <h4 class="section-title">Produto & Cálculo</h4>
                                    </div>
                                    <div class="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <div class="flex justify-between items-center mb-1.5">
                                                <label style="margin-bottom:0;">Produto / Serviço</label>
                                                <button type="button" id="btn-quick-add-product" class="text-[10px] font-bold flex items-center gap-1 transition-all px-2 py-0.5 rounded-md" style="color:var(--primary); background:var(--primary-light);" onmouseover="this.style.background='var(--primary)';this.style.color='white'" onmouseout="this.style.background='var(--primary-light)';this.style.color='var(--primary)'">
                                                    <span class="material-symbols-outlined" style="font-size:12px;">add</span>
                                                    Novo
                                                </button>
                                            </div>
                                            <input type="text" id="q-product" placeholder="Ex: Banner Lona Frontlight" required list="products-list" autocomplete="off">
                                            <datalist id="products-list">
                                                ${(DB.get('products')||[]).map(p => `<option value="${p.name}">`).join('')}
                                            </datalist>
                                        </div>
                                        <div>
                                            <label>Tipo de Cobrança</label>
                                            <select id="q-type">
                                                <option value="m2">Por metro quadrado (m²)</option>
                                                <option value="un">Por unidade</option>
                                                <option value="ct">Por cento (100 un)</option>
                                                <option value="mi">Por milheiro (1.000 un)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <!-- Calc Row -->
                                    <div class="grid gap-3 p-4 rounded-[14px]" style="grid-template-columns:1fr 1fr 1fr 1fr 1fr; background:#FAFBFF; border:1px solid var(--border);">
                                        <div>
                                            <label>Qtd.</label>
                                            <input type="number" id="q-qty" value="" min="1">
                                        </div>
                                        <div class="item-dim">
                                            <label>Larg. (cm)</label>
                                            <input type="number" id="q-width" value="">
                                        </div>
                                        <div class="item-dim">
                                            <label>Alt. (cm)</label>
                                            <input type="number" id="q-height" value="">
                                        </div>
                                        <div>
                                            <label id="label-unit-price">Valor / m²</label>
                                            <div class="input-prefix-wrap">
                                                <span class="prefix">R$</span>
                                                <input type="number" id="q-unit-price" value="" min="0" step="0.01">
                                            </div>
                                        </div>
                                        <div>
                                            <label>Total</label>
                                            <div id="q-total-item" class="total-display-premium">R$ 0,00</div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Acabamentos -->
                                <div class="section-card">
                                    <div class="section-header">
                                        <div class="section-icon"><span class="material-symbols-outlined">auto_awesome</span></div>
                                        <h4 class="section-title">Acabamentos Especiais</h4>
                                    </div>
                                    <div class="flex flex-wrap gap-2">
                                        ${[
                                            { label: 'Ilhós', cost: 15 },
                                            { label: 'Laminação Fosca', cost: 25 },
                                            { label: 'Verniz UV', cost: 30 },
                                            { label: 'Dobra', cost: 10 },
                                            { label: 'Corte Especial', cost: 20 },
                                            { label: 'Instalação', cost: 50 },
                                        ].map(opt => `
                                            <label class="acabamento-pill" data-cost="${opt.cost}">
                                                <input type="checkbox" class="hidden acabamento-check">
                                                <span class="acabamento-label">${opt.label}</span>
                                            </label>
                                        `).join('')}
                                    </div>
                                    <p class="text-xs mt-3" style="color:var(--text-faint);">Cada acabamento adiciona custo fixo ao total do orçamento.</p>
                                </div>

                            </form>
                        </div>

                        <!-- Footer -->
                        <div class="flex items-center justify-between px-6 py-4 border-t" style="border-color:var(--border); background:white;">
                            <button type="button" id="btn-cancel-quote" class="btn-ghost">Cancelar</button>
                            <button form="form-quote" type="submit" class="btn-primary">
                                <span class="material-symbols-outlined" style="font-size:18px;">check_circle</span>
                                Gerar Orçamento
                            </button>
                        </div>
                    </div>

                    <!-- RIGHT: Summary 35% -->
                    <div class="hidden lg:flex flex-col sidebar-summary overflow-y-auto" style="flex:0 0 35%;">
                        <div class="px-6 pt-6 pb-4 border-b" style="border-color:var(--border);">
                            <p class="label-caps">Resumo em Tempo Real</p>
                        </div>
                        <div class="flex-1 px-6 py-5 space-y-4">

                            <!-- Total Card -->
                            <div class="p-5 rounded-[20px] border" style="background:white; border-color:var(--border); box-shadow:var(--shadow-2);">
                                <div class="space-y-3">
                                    <div class="flex justify-between items-center">
                                        <span class="label-caps">Subtotal</span>
                                        <span class="text-sm font-bold" style="color:var(--text-sub);" id="summ-subtotal">R$ 45,00</span>
                                    </div>
                                    <div class="flex justify-between items-center">
                                        <span class="label-caps">Acabamentos</span>
                                        <span class="text-sm font-bold" style="color:#059669;" id="summ-extras">R$ 0,00</span>
                                    </div>
                                    <div class="flex justify-between items-center">
                                        <span class="label-caps">Desconto</span>
                                        <span class="text-sm font-bold" style="color:#D97706;" id="summ-discount-display">— %</span>
                                    </div>
                                    <div class="h-px" style="background:var(--border);"></div>
                                    <div class="text-center pt-1">
                                        <p class="label-caps mb-1" style="color:var(--primary);">TOTAL FINAL</p>
                                        <p class="text-4xl font-black tracking-tighter" style="color:var(--text-main); letter-spacing:-0.04em;" id="summ-total">R$ 45,00</p>
                                        <p class="text-xs mt-2" style="color:var(--text-faint);">Válido por 15 dias corridos</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Details -->
                            <div class="p-4 rounded-[16px] border" style="background:white; border-color:var(--border);">
                                <p class="label-caps mb-3">Detalhes do Pedido</p>
                                <div class="space-y-2.5">
                                    <div class="flex justify-between items-center text-xs">
                                        <span style="color:var(--text-muted);">Cliente</span>
                                        <span class="font-bold truncate max-w-[140px]" style="color:var(--text-sub);" id="summ-customer">—</span>
                                    </div>
                                    <div class="flex justify-between items-center text-xs">
                                        <span style="color:var(--text-muted);">Produto</span>
                                        <span class="font-bold truncate max-w-[140px]" style="color:var(--text-sub);" id="summ-product">—</span>
                                    </div>
                                    <div class="flex justify-between items-center text-xs">
                                        <span style="color:var(--text-muted);">Quantidade</span>
                                        <span class="font-bold" style="color:var(--text-sub);" id="summ-qty">1 un</span>
                                    </div>
                                    <div class="flex justify-between items-center text-xs">
                                        <span style="color:var(--text-muted);">Prazo Estimado</span>
                                        <span class="font-bold" style="color:var(--text-sub);">3 a 5 dias úteis</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Discount -->
                            <div class="p-4 rounded-[16px] border" style="background:white; border-color:var(--border);">
                                <p class="label-caps mb-3">Desconto Comercial</p>
                                <div class="flex items-center gap-2">
                                    <input type="number" id="q-discount" value="0" min="0" max="100" placeholder="0" style="font-size:14px; font-weight:700;">
                                    <span class="font-black flex-shrink-0" style="color:var(--text-faint); font-size:14px;">%</span>
                                </div>
                            </div>

                            <!-- Info Banner -->
                            <div class="p-4 rounded-[16px] overflow-hidden relative" style="background:linear-gradient(135deg,var(--primary),var(--primary-dark)); color:white;">
                                <div class="absolute -right-4 -top-4 w-16 h-16 rounded-full" style="background:rgba(255,255,255,0.08);"></div>
                                <div class="relative flex items-start gap-3">
                                    <span class="material-symbols-outlined opacity-80" style="font-size:20px;">verified_user</span>
                                    <div>
                                        <p class="text-sm font-black">Proposta Profissional</p>
                                        <p class="text-xs opacity-70 mt-1 leading-snug">Validade de 15 dias. Envio via WhatsApp disponível.</p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            <!-- QUICK PRODUCT MODAL -->
            <div id="quick-product-modal" class="hidden fixed inset-0 z-[110] flex items-center justify-center p-4" style="background:rgba(10,10,20,0.5); backdrop-filter:blur(8px);">
                <div class="confirm-card" style="max-width: 420px; padding: 1.5rem; text-align: left;">
                    <div class="flex justify-between items-center mb-4">
                        <div class="flex items-center gap-2">
                            <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:var(--primary-light); color:var(--primary);">
                                <span class="material-symbols-outlined" style="font-size:18px;">add_box</span>
                            </div>
                            <h4 class="text-base font-black" style="color:var(--text-main);">Novo Produto Rápido</h4>
                        </div>
                        <button type="button" id="close-quick-product" class="w-7 h-7 flex items-center justify-center rounded-full transition-all" style="color:var(--text-faint);" onmouseover="this.style.background='#F8F6FF'" onmouseout="this.style.background='transparent'">
                            <span class="material-symbols-outlined" style="font-size:16px;">close</span>
                        </button>
                    </div>
                    <form id="form-quick-product" class="space-y-3">
                        <div>
                            <label>Nome do Produto</label>
                            <input type="text" id="qp-name" required placeholder="Ex: Cartão de Visita Premium">
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label>Categoria</label>
                                <select id="qp-category">
                                    <option value="Adesivos">Adesivos</option>
                                    <option value="Banners">Banners</option>
                                    <option value="Cartões">Cartões</option>
                                    <option value="Diversos">Diversos</option>
                                </select>
                            </div>
                            <div>
                                <label>Valor Padrão (R$)</label>
                                <input type="number" id="qp-price" required min="0" step="0.01" value="0.00">
                            </div>
                        </div>
                        <div class="pt-3 flex gap-2">
                            <button type="button" id="btn-cancel-quick-product" class="btn-ghost flex-1 justify-center">Cancelar</button>
                            <button type="submit" id="btn-save-quick-product" class="btn-primary flex-1 justify-center">
                                <span class="material-symbols-outlined" style="font-size:16px;">save</span>
                                Salvar Produto
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        Quotes.initEvents(container);
    },

    kpi: (label, value, icon, color, bg) => `
        <div class="kpi-card">
            <div class="flex justify-between items-start gap-3">
                <div class="w-11 h-11 rounded-[14px] flex items-center justify-center flex-shrink-0" style="background:${bg}; color:${color};">
                    <span class="material-symbols-outlined" style="font-size:22px;">${icon}</span>
                </div>
                <div class="flex flex-col items-end flex-1 min-w-0">
                    <span class="label-caps text-right">${label}</span>
                    <span class="text-2xl font-black mt-1" style="color:var(--text-main); letter-spacing:-0.03em;">${value}</span>
                </div>
            </div>
        </div>
    `,

    renderRow: (q, customers) => {
        const customer = customers.find(c => c.id === q.customerId);
        const name = customer?.name || q.customerName || '—';
        const badgeClass = q.status === 'Aberto' ? 'badge-orange' : 'badge-green';
        const fmtBRL = (v) => parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        return `
            <tr style="border-bottom:1px solid #F8F6FF; transition:background 0.15s;" onmouseover="this.style.background='#FAFBFF'" onmouseout="this.style.background=''">
                <td class="px-5 py-3.5">
                    <p class="text-xs font-black" style="color:var(--primary);">${q.id}</p>
                    <p class="text-xs" style="color:var(--text-faint);">${q.date}</p>
                </td>
                <td class="px-5 py-3.5">
                    <p class="text-sm font-bold" style="color:var(--text-main);">${name}</p>
                    <p class="text-xs" style="color:var(--text-faint);">${q.whatsapp || '—'}</p>
                </td>
                <td class="px-5 py-3.5">
                    <p class="text-sm font-medium" style="color:var(--text-sub);">${q.productName || '—'}</p>
                    <p class="text-xs truncate max-w-[200px]" style="color:var(--text-faint);">${q.obs || 'Sem observações'}</p>
                </td>
                <td class="px-5 py-3.5 text-right text-sm font-bold" style="color:var(--text-main);">${fmtBRL(q.value)}</td>
                <td class="px-5 py-3.5 text-center"><span class="badge ${badgeClass}">${q.status}</span></td>
                <td class="px-5 py-3.5 text-center">
                    <div class="flex justify-center gap-1.5">
                        <button class="text-xs font-bold px-3 py-1.5 rounded-[10px] transition-all" style="background:var(--primary-light); color:var(--primary);" onmouseover="this.style.background='var(--primary)';this.style.color='white'" onmouseout="this.style.background='var(--primary-light)';this.style.color='var(--primary)'" onclick="window.convertToSale('${q.id}')">
                            Aprovar
                        </button>
                        <button class="w-8 h-8 flex items-center justify-center rounded-[10px] transition-all" style="color:var(--text-faint);" onmouseover="this.style.background='#F8F6FF'" onmouseout="this.style.background='transparent'" onclick="window.shareQuote('${q.id}')">
                            <span class="material-symbols-outlined" style="font-size:16px;">share</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },

    initEvents: (container) => {
        const modal    = document.getElementById('quote-modal');
        const btnAdd   = document.getElementById('btn-add-quote');
        const btnAddEmpty = document.getElementById('btn-add-quote-empty');
        const btnClose = document.getElementById('close-quote-modal');
        const btnCancel= document.getElementById('btn-cancel-quote');
        const form     = document.getElementById('form-quote');

        if (!form) return;

        let currentQuoteTotal = 0;

        // -- Price Calculation ----------------------------------------
        const fmtBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const updatePrice = () => {
            const qty       = parseFloat(document.getElementById('q-qty')?.value)        || 0;
            const width     = parseFloat(document.getElementById('q-width')?.value)      || 0;
            const height    = parseFloat(document.getElementById('q-height')?.value)     || 0;
            const unitPrice = parseFloat(document.getElementById('q-unit-price')?.value) || 0;
            const type      = document.getElementById('q-type')?.value || 'm2';
            const discount  = Math.min(100, Math.max(0, parseFloat(document.getElementById('q-discount')?.value) || 0));

            // Calculate extras from checked pills
            let extras = 0;
            document.querySelectorAll('.acabamento-pill.pill-active').forEach(pill => {
                extras += parseFloat(pill.dataset.cost || 0);
            });

            // Base subtotal
            let subtotal = 0;
            if (type === 'm2') {
                subtotal = (width / 100) * (height / 100) * unitPrice * qty;
                document.querySelectorAll('.item-dim').forEach(el => el.style.display = '');
                const lbl = document.getElementById('label-unit-price');
                if (lbl) lbl.innerText = 'Valor / m²';
            } else {
                subtotal = unitPrice * qty;
                document.querySelectorAll('.item-dim').forEach(el => el.style.display = 'none');
                const lbl = document.getElementById('label-unit-price');
                if (lbl) lbl.innerText = 'Valor Unitário';
            }

            // Apply extras & discount
            const withExtras = subtotal + extras;
            currentQuoteTotal = withExtras * (1 - discount / 100);

            // Update DOM
            const set = (id, txt) => { const el = document.getElementById(id); if (el) el.innerText = txt; };
            set('q-total-item',         fmtBRL(currentQuoteTotal));
            set('summ-subtotal',        fmtBRL(subtotal));
            set('summ-extras',          extras > 0 ? `+ ${fmtBRL(extras)}` : 'R$ 0,00');
            set('summ-discount-display',discount > 0 ? `- ${discount}%` : '— %');
            set('summ-total',           fmtBRL(currentQuoteTotal));
            set('summ-customer',        document.getElementById('q-customer')?.value || '—');
            set('summ-product',         document.getElementById('q-product')?.value  || '—');
            set('summ-qty',             `${document.getElementById('q-qty')?.value || 1} un`);
        };

        // Wire all inputs
        ['q-qty','q-width','q-height','q-unit-price','q-type','q-discount','q-product'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', updatePrice);
        });

        const customerInput = document.getElementById('q-customer');
        if (customerInput) {
            customerInput.addEventListener('input', (e) => {
                updatePrice();
                const customers = DB.get('customers') || [];
                const selected = customers.find(c => c.name === e.target.value);
                if (selected) {
                    const phoneInput = document.getElementById('q-whatsapp');
                    const compInput = document.getElementById('q-company');
                    if (phoneInput) phoneInput.value = selected.phone || '';
                    if (compInput) compInput.value = selected.document || '';
                }
            });
        }

        // Pill toggle
        document.querySelectorAll('.acabamento-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                const check = pill.querySelector('.acabamento-check');
                if (check) {
                    check.checked = !check.checked;
                    pill.classList.toggle('pill-active', check.checked);
                    updatePrice();
                }
            });
        });

        // Run initial calc
        updatePrice();

        // Modal open/close
        const openModal = () => { modal.classList.remove('hidden'); setTimeout(() => document.getElementById('q-customer')?.focus(), 100); };
        const closeModal = () => modal.classList.add('hidden');

        if (btnAdd)      btnAdd.onclick      = openModal;
        if (btnAddEmpty) btnAddEmpty.onclick = openModal;
        if (btnClose)    btnClose.onclick    = closeModal;
        if (btnCancel)   btnCancel.onclick   = closeModal;

        // Click backdrop to close
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

        // Form submit
        form.onsubmit = (e) => {
            e.preventDefault();
            
            const customerName = document.getElementById('q-customer')?.value || '';
            const allCustomers = DB.get('customers') || [];
            const matchedC = allCustomers.find(c => c.name === customerName);

            const newQuote = {
                id:           `QUO-${Math.floor(100 + Math.random() * 900)}`,
                customerId:   matchedC ? matchedC.id : null,
                customerName: customerName,
                whatsapp:     document.getElementById('q-whatsapp')?.value || '',
                productName:  document.getElementById('q-product')?.value  || '',
                company:      document.getElementById('q-company')?.value  || '',
                city:         document.getElementById('q-city')?.value     || '',
                value:        currentQuoteTotal,
                status:       'Aberto',
                date:         new Date().toISOString().split('T')[0],
                obs:          document.getElementById('q-obs')?.value || ''
            };

            const quotes = DB.get('quotes') || [];
            quotes.unshift(newQuote);
            DB.save('quotes', quotes);

            import('../app.js').then(m => m.default.toast('Orçamento salvo com sucesso!'));

            closeModal();
            Quotes.render(container);
        };

        // Convert to sale
        window.convertToSale = (id) => {
            import('../app.js').then(m => {
                m.default.confirm({
                    title: 'Converter em Venda?',
                    message: `O orçamento ${id} será transformado em pedido de produção.`,
                    type: 'success',
                    confirmLabel: 'Converter',
                    onConfirm: () => {
                        const quotes = DB.get('quotes') || [];
                        const quote  = quotes.find(q => q.id === id);
                        if (quote) {
                            const orders = DB.get('orders') || [];
                            orders.unshift({ ...quote, id: `ORD-${quote.id.split('-')[1]}`, status: 'Produção' });
                            DB.save('orders', orders);
                            DB.save('quotes', quotes.filter(q => q.id !== id));
                            m.default.toast('Venda gerada com sucesso!', 'success');
                            Quotes.render(container);
                        }
                    }
                });
            });
        };

        window.shareQuote = (id) => {
            const quotes = DB.get('quotes') || [];
            const q = quotes.find(item => item.id === id);
            if (!q) return;

            const text = `*Orçamento Gestor Gráfico Pro*%0A%0A` +
                `*ID:* ${q.id}%0A` +
                `*Produto:* ${q.productName}%0A` +
                `*Valor:* R$ ${q.value.toFixed(2)}%0A` +
                `*Data:* ${q.date}%0A%0A` +
                `Aguardamos sua aprovação!`;
            
            const wpUrl = `https://api.whatsapp.com/send?text=${text}`;
            window.open(wpUrl, '_blank');
        };

        // --- Auto-fill price when existing product selected ---
        const qProductInput = document.getElementById('q-product');
        if (qProductInput) {
            qProductInput.addEventListener('change', (e) => {
                const val = e.target.value;
                const products = DB.get('products') || [];
                const matched = products.find(p => p.name === val);
                if (matched) {
                    const priceInput = document.getElementById('q-unit-price');
                    if (priceInput) {
                        priceInput.value = parseFloat(matched.price || 0).toFixed(2);
                        priceInput.dispatchEvent(new Event('input'));
                    }
                }
            });
        }

        // --- Quick Add Product Logic ---
        const btnQuickAdd = document.getElementById('btn-quick-add-product');
        const modalQuick = document.getElementById('quick-product-modal');
        const formQuick = document.getElementById('form-quick-product');
        
        if (btnQuickAdd) {
            btnQuickAdd.addEventListener('click', () => {
                modalQuick.classList.remove('hidden');
                setTimeout(() => document.getElementById('qp-name')?.focus(), 100);
            });
        }
        
        const closeQuick = () => {
            modalQuick.classList.add('hidden');
            formQuick?.reset();
        };

        document.getElementById('close-quick-product')?.addEventListener('click', closeQuick);
        document.getElementById('btn-cancel-quick-product')?.addEventListener('click', closeQuick);

        // Click backdrop to close
        modalQuick?.addEventListener('click', (e) => { if (e.target === modalQuick) closeQuick(); });

        formQuick?.addEventListener('submit', (e) => {
            e.preventDefault();
            const btnSave = document.getElementById('btn-save-quick-product');
            const originalHTML = btnSave.innerHTML;
            btnSave.innerHTML = '<span class="material-symbols-outlined animate-spin" style="font-size:16px;">sync</span> Salvando...';
            btnSave.disabled = true;
            
            setTimeout(() => {
                const name = document.getElementById('qp-name').value;
                const price = parseFloat(document.getElementById('qp-price').value) || 0;
                const category = document.getElementById('qp-category').value;
                
                const products = DB.get('products') || [];
                products.unshift({
                    id: `PROD-${Math.floor(1000 + Math.random() * 9000)}`,
                    name,
                    category,
                    price,
                    cost: price * 0.5,
                    stock: 99,
                    status: true
                });
                DB.save('products', products);
                
                import('../app.js').then(m => m.default.toast('Produto cadastrado!'));
                
                // Update quote form fields
                if (qProductInput) {
                    qProductInput.value = name;
                    
                    // Update datalist without fully re-rendering
                    const dlist = document.getElementById('products-list');
                    if (dlist) {
                        dlist.innerHTML = products.map(p => `<option value="${p.name}">`).join('');
                    }
                    qProductInput.dispatchEvent(new Event('input'));
                }
                
                const qPrice = document.getElementById('q-unit-price');
                if (qPrice) {
                    qPrice.value = price.toFixed(2);
                    qPrice.dispatchEvent(new Event('input'));
                }
                
                closeQuick();
                btnSave.innerHTML = originalHTML;
                btnSave.disabled = false;
            }, 400); // 400ms loading for premium UX feel
        });
    }
};

export default Quotes;
