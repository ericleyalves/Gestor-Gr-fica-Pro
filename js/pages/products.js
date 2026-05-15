import DB from '../db.js';

const Products = {
    render: (container) => {
        const products = DB.get('products') || [];
        
        container.innerHTML = `
            <div class="max-w-[1400px] mx-auto flex flex-col gap-6 page-enter">
                
                <!-- Page Header -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 class="page-title">Catálogo de Produtos 📦</h2>
                        <p class="text-sm mt-1" style="color:var(--text-muted);">Gerencie seus insumos, produtos finais e precificação inteligente.</p>
                    </div>
                    <button id="btn-add-product" class="btn-primary">
                        <span class="material-symbols-outlined" style="font-size:18px;">add</span>
                        Novo Produto
                    </button>
                </div>

                <!-- KPI Grid -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    ${Products.kpi('Total de Produtos', products.length, 'inventory_2', '#6C2BFF', '#F0EBFF')}
                    ${Products.kpi('Ativos', products.filter(p => p.status).length, 'check_circle', '#10B981', '#ECFDF5')}
                    ${Products.kpi('Baixo Estoque', products.filter(p => p.manageStock !== false && (p.stock || 0) < 10).length, 'warning', '#D97706', '#FFFBEB')}
                    ${Products.kpi('Valor em Estoque', Products.calcStockValue(products), 'payments', '#2563EB', '#EFF6FF')}
                </div>

                <!-- Search & Filters -->
                <div class="action-bar">
                    <div class="search-input-wrap">
                        <span class="material-symbols-outlined">search</span>
                        <input type="text" id="product-search" placeholder="Buscar por nome, categoria ou referência...">
                    </div>
                    <div class="flex gap-2">
                        <button class="btn-ghost" style="padding: 0 12px; height: 42px;">
                            <span class="material-symbols-outlined" style="font-size:20px;">filter_list</span>
                        </button>
                    </div>
                </div>

                <!-- Product Table -->
                <div class="data-table">
                    ${products.length === 0 
                        ? `<div class="empty-state">
                               <div class="empty-state-icon"><span class="material-symbols-outlined">inventory_2</span></div>
                               <h3>Nenhum produto cadastrado</h3>
                               <p>Comece adicionando seus produtos para gerar orçamentos.</p>
                               <button class="btn-primary" id="btn-add-product-empty">Cadastrar Produto</button>
                           </div>`
                        : `<div class="overflow-x-auto">
                               <table class="w-full text-left border-collapse">
                                   <thead>
                                       <tr style="background:#FAFBFF; border-bottom:1px solid var(--border);">
                                           <th class="px-5 py-3 label-caps">Produto</th>
                                           <th class="px-5 py-3 label-caps">Referência / Cat</th>
                                           <th class="px-5 py-3 label-caps text-right">Margem</th>
                                           <th class="px-5 py-3 label-caps text-right">Preço Venda</th>
                                           <th class="px-5 py-3 label-caps text-center">Status</th>
                                           <th class="px-5 py-3 label-caps text-center">Ações</th>
                                       </tr>
                                   </thead>
                                   <tbody>
                                       ${products.map(p => Products.renderRow(p)).join('')}
                                   </tbody>
                               </table>
                           </div>`
                    }
                </div>
            </div>

            <!-- PRODUCT MODAL -->
            <div id="product-modal" class="hidden fixed inset-0 z-[100] flex items-center justify-center p-4" style="background:rgba(10,10,20,0.5); backdrop-filter:blur(8px);">
                <div class="quote-modal-inner">
                    <!-- LEFT: Form -->
                    <div class="flex flex-col min-w-0" style="flex:0 0 65%; border-right:1px solid var(--border);">
                        <div class="flex justify-between items-center px-6 py-4 border-b" style="border-color:var(--border);">
                            <div class="flex items-center gap-3">
                                <div class="section-icon"><span class="material-symbols-outlined">inventory_2</span></div>
                                <div>
                                    <h3 class="text-lg font-black" style="color:var(--text-main); letter-spacing:-0.02em;" id="modal-title">Novo Produto</h3>
                                    <p class="text-xs" style="color:var(--text-faint);">Defina custos, margens e detalhes técnicos.</p>
                                </div>
                            </div>
                            <button id="close-product-modal" class="w-8 h-8 flex items-center justify-center rounded-full transition-all" style="color:var(--text-faint);" onmouseover="this.style.background='#F8F6FF'" onmouseout="this.style.background='transparent'">
                                <span class="material-symbols-outlined" style="font-size:18px;">close</span>
                            </button>
                        </div>

                        <div class="flex-1 overflow-y-auto px-6 py-5" style="background:var(--bg-main);">
                            <form id="form-product" class="space-y-4">
                                <!-- 1. Informações Gerais -->
                                <div class="section-card">
                                    <div class="section-header">
                                        <div class="section-icon"><span class="material-symbols-outlined">info</span></div>
                                        <h4 class="section-title">Informações Gerais</h4>
                                    </div>
                                    <div class="grid grid-cols-2 gap-4">
                                        <div class="col-span-2">
                                            <label>Nome do Produto</label>
                                            <input type="text" id="p-name" placeholder="Ex: Cartão de Visita Couchê 300g" required autocomplete="off">
                                        </div>
                                        <div>
                                            <label>Referência / SKU</label>
                                            <input type="text" id="p-ref" placeholder="EX: CV-300" autocomplete="off">
                                        </div>
                                        <div>
                                            <label>Categoria</label>
                                            <select id="p-category">
                                                <option>Cartões</option>
                                                <option>Banners</option>
                                                <option>Adesivos</option>
                                                <option>Diversos</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <!-- 2. Variações / Acabamentos (MOVED UP) -->
                                <div class="section-card">
                                    <div class="section-header">
                                        <div class="section-icon"><span class="material-symbols-outlined">tune</span></div>
                                        <div class="flex-1">
                                            <h4 class="section-title">Variações / Opções</h4>
                                            <p class="text-xs" style="color:var(--text-faint);">Ex: Quantidade, Verniz, Material...</p>
                                        </div>
                                        <button type="button" id="btn-add-variation" class="btn-ghost !py-1 !px-2 text-xs">
                                            <span class="material-symbols-outlined !text-sm">add</span>
                                            Nova Variação
                                        </button>
                                    </div>
                                    <div id="variations-container" class="space-y-4 mt-4">
                                        <!-- Variations will be rendered here -->
                                    </div>
                                </div>

                                <!-- 3. Precificação Base REMOVED -->
                                <input type="hidden" id="p-type" value="un">
                                <input type="hidden" id="p-cost" value="0">
                                <input type="hidden" id="p-margin" value="0">
                                
                                <!-- 4. Estoque -->
                                <div class="section-card">
                                    <div class="section-header">
                                        <div class="section-icon"><span class="material-symbols-outlined">layers</span></div>
                                        <h4 class="section-title">Gestão de Estoque</h4>
                                    </div>
                                    <div class="space-y-4">
                                        <div class="flex items-center justify-between p-3 rounded-xl border bg-slate-50" style="border-color:var(--border);">
                                            <div>
                                                <p class="text-sm font-bold" style="color:var(--text-main);">Controlar Estoque?</p>
                                                <p class="text-[10px]" style="color:var(--text-faint);">Ative para monitorar baixas automáticas.</p>
                                            </div>
                                            <label class="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" id="p-manage-stock" class="sr-only peer">
                                                <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                        <div id="stock-qty-container" style="display:none;">
                                            <label>Quantidade Atual</label>
                                            <input type="number" id="p-stock" min="0" value="0">
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div class="flex items-center justify-between px-6 py-4 border-t" style="border-color:var(--border); background:white;">
                            <button type="button" id="btn-cancel-product" class="btn-ghost">Cancelar</button>
                            <button form="form-product" type="submit" class="btn-primary">
                                <span class="material-symbols-outlined" style="font-size:18px;">check_circle</span>
                                Salvar Produto
                            </button>
                                           <!-- RIGHT: Intelligence REMOVED to simplify as requested -->
                    <div class="hidden">
                        <div id="display-price">0</div>
                        <div id="margin-label">0</div>
                        <div id="val-cost">0</div>
                        <div id="val-profit">0</div>
                        <div id="roi-text">0</div>
                        <div id="roi-bar"></div>
                    </div>        </div>
                    </div>
                </div>
            </div>
        `;

        Products.initEvents(container);
    },

    kpi: (label, value, icon, color, bg) => `
        <div class="kpi-card">
            <div class="flex justify-between items-start gap-3">
                <div class="w-11 h-11 rounded-[14px] flex items-center justify-center" style="background:${bg}; color:${color};">
                    <span class="material-symbols-outlined" style="font-size:22px;">${icon}</span>
                </div>
                <div class="flex flex-col items-end flex-1 min-w-0">
                    <span class="label-caps text-right">${label}</span>
                    <span class="text-2xl font-black mt-1" style="color:var(--text-main);">${value}</span>
                </div>
            </div>
        </div>
    `,

    calcStockValue: (products) => {
        const total = products.reduce((sum, p) => {
            if (p.manageStock === false) return sum;
            return sum + (parseFloat(p.cost || 0) * (p.stock || 0));
        }, 0);
        return total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    },

    renderRow: (p) => {
        const fmt = (v) => parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const margin = p.cost > 0 ? (((p.price / p.cost) - 1) * 100).toFixed(0) : 0;
        return `
            <tr style="border-bottom:1px solid #F8F6FF; transition:background 0.15s;" onmouseover="this.style.background='#FAFBFF'" onmouseout="this.style.background=''">
                <td class="px-5 py-3.5">
                    <p class="text-sm font-bold" style="color:var(--text-main);">${p.name}</p>
                    <div class="flex items-center gap-2">
                        <p class="text-xs font-semibold" style="color:var(--text-faint); text-transform:uppercase">${p.type === 'm2' ? 'Por Metro Quadrado' : 'Unidade'}</p>
                        ${p.manageStock === false ? '<span class="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold">SEM ESTOQUE</span>' : ''}
                    </div>
                </td>
                <td class="px-5 py-3.5">
                    <p class="text-xs font-black" style="color:var(--primary);">${p.ref || 'S/ REF'}</p>
                    <p class="text-xs" style="color:var(--text-faint);">${p.category}</p>
                </td>
                <td class="px-5 py-3.5 text-right">
                    <span class="badge badge-purple">${margin}%</span>
                </td>
                <td class="px-5 py-3.5 text-right text-sm font-bold" style="color:var(--text-main);">${fmt(p.price)}</td>
                <td class="px-5 py-3.5 text-center">
                    <span class="badge ${p.status ? 'badge-green' : 'badge-orange'}">${p.status ? 'Ativo' : 'Inativo'}</span>
                </td>
                <td class="px-5 py-3.5 text-center">
                    <div class="flex justify-center gap-1">
                        <button class="w-8 h-8 flex items-center justify-center rounded-[10px] transition-all" style="color:var(--text-faint);" onmouseover="this.style.background='#F0F9FF';this.style.color='#0EA5E9'" onmouseout="this.style.background='transparent';this.style.color='var(--text-faint)'" onclick="window.duplicateProduct('${p.id}')" title="Duplicar Produto">
                            <span class="material-symbols-outlined" style="font-size:18px;">content_copy</span>
                        </button>
                        <button class="w-8 h-8 flex items-center justify-center rounded-[10px] transition-all" style="color:var(--text-faint);" onmouseover="this.style.background='var(--primary-light)';this.style.color='var(--primary)'" onmouseout="this.style.background='transparent';this.style.color='var(--text-faint)'" onclick="window.editProduct('${p.id}')">
                            <span class="material-symbols-outlined" style="font-size:18px;">edit</span>
                        </button>
                        <button class="w-8 h-8 flex items-center justify-center rounded-[10px] transition-all" style="color:var(--text-faint);" onmouseover="this.style.background='#FEF2F2';this.style.color='#EF4444'" onmouseout="this.style.background='transparent';this.style.color='var(--text-faint)'" onclick="window.deleteProduct('${p.id}')">
                            <span class="material-symbols-outlined" style="font-size:18px;">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },

    initEvents: (container) => {
        const modal = document.getElementById('product-modal');
        const btnAdd = document.getElementById('btn-add-product');
        const btnAddEmpty = document.getElementById('btn-add-product-empty');
        const btnClose = document.getElementById('close-product-modal');
        const btnCancel = document.getElementById('btn-cancel-product');
        const form = document.getElementById('form-product');
        const varContainer = document.getElementById('variations-container');
        const btnAddVar = document.getElementById('btn-add-variation');
        
        let editingId = null;
        let currentVariations = [];

        const renderVariations = () => {
            varContainer.innerHTML = currentVariations.map((v, gIdx) => `
                <div class="p-4 rounded-xl border bg-slate-50/50" style="border-color:var(--border);">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex-1 mr-4">
                            <label class="text-[10px] !mb-1 uppercase font-black" style="color:var(--primary);">Nome do Grupo (Ex: Material, Cor, Cobertura, Tamanho)</label>
                            <input type="text" value="${v.name}" oninput="window.updateVariationGroup(${gIdx}, this.value)" placeholder="Ex: Material" class="!py-1.5 text-sm font-bold">
                        </div>
                        <div class="flex gap-2 items-center">
                            <button type="button" onclick="window.addOption(${gIdx})" class="btn-ghost !py-1 !px-2 text-[10px] font-bold h-8">
                                <span class="material-symbols-outlined !text-xs">add</span> Opção
                            </button>
                            <button type="button" onclick="window.removeVariationGroup(${gIdx})" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-500 transition-all text-slate-400">
                                <span class="material-symbols-outlined !text-sm">delete</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="space-y-2 pl-4 border-l-2" style="border-color:var(--primary-light);">
                        ${v.options.map((opt, oIdx) => `
                            <div class="grid grid-cols-[1fr,80px,80px,32px] gap-1.5 items-end">
                                <div>
                                    <label class="text-[9px] !mb-0.5 uppercase">Opção (Ex: 1000 un)</label>
                                    <input type="text" value="${opt.name}" oninput="window.updateOption(${gIdx}, ${oIdx}, 'name', this.value)" placeholder="Ex: 500 un" class="!py-1 text-xs">
                                </div>
                                <div>
                                    <label class="text-[9px] !mb-0.5 uppercase text-right">Custo +</label>
                                    <input type="number" value="${opt.cost}" oninput="window.updateOption(${gIdx}, ${oIdx}, 'cost', this.value)" placeholder="0.00" step="0.01" class="!py-1 text-xs text-right">
                                </div>
                                <div>
                                    <label class="text-[9px] !mb-0.5 uppercase text-right">Preço +</label>
                                    <input type="number" value="${opt.price}" oninput="window.updateOption(${gIdx}, ${oIdx}, 'price', this.value)" placeholder="0.00" step="0.01" class="!py-1 text-xs text-right">
                                </div>
                                <button type="button" onclick="window.removeOption(${gIdx}, ${oIdx})" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-500 transition-all text-slate-400">
                                    <span class="material-symbols-outlined !text-xs">close</span>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');

            if (currentVariations.length === 0) {
                varContainer.innerHTML = `<p class="text-[11px] text-center py-2 italic" style="color:var(--text-faint);">Nenhuma variação adicionada.</p>`;
            }
        };

        window.updateVariationGroup = (gIdx, name) => {
            currentVariations[gIdx].name = name;
        };

        window.addOption = (gIdx) => {
            currentVariations[gIdx].options.push({ name: '', price: 0, cost: 0 });
            renderVariations();
        };

        window.updateOption = (gIdx, oIdx, field, value) => {
            currentVariations[gIdx].options[oIdx][field] = field === 'name' ? value : parseFloat(value) || 0;
        };

        window.removeOption = (gIdx, oIdx) => {
            currentVariations[gIdx].options.splice(oIdx, 1);
            renderVariations();
        };

        window.removeVariationGroup = (gIdx) => {
            currentVariations.splice(gIdx, 1);
            renderVariations();
        };

        if (btnAddVar) {
            btnAddVar.onclick = () => {
                currentVariations.push({ name: '', options: [{ name: '', price: 0, cost: 0 }] });
                renderVariations();
            };
        }

        const openModal = (id = null) => {
            editingId = id;
            form.reset();
            currentVariations = [];
            document.getElementById('modal-title').innerText = id ? 'Editar Produto' : 'Novo Produto';
            
            if (id) {
                const products = DB.get('products') || [];
                const p = products.find(item => item.id === id);
                if (p) {
                    document.getElementById('p-name').value = p.name;
                    document.getElementById('p-ref').value = p.ref || '';
                    document.getElementById('p-category').value = p.category;
                    document.getElementById('p-type').value = p.type;
                    document.getElementById('p-cost').value = p.cost;
                    const margin = p.cost > 0 ? (((p.price / p.cost) - 1) * 100).toFixed(0) : 100;
                    document.getElementById('p-margin').value = margin;
                    document.getElementById('p-manage-stock').checked = p.manageStock !== false;
                    document.getElementById('p-stock').value = p.stock || 0;
                    document.getElementById('stock-qty-container').style.display = p.manageStock !== false ? 'block' : 'none';
                    currentVariations = JSON.parse(JSON.stringify(p.variations || []));
                }
            }
            
            modal.classList.remove('hidden');
            renderVariations();
            updateCalc();
        };

        if (document.getElementById('p-manage-stock')) {
            document.getElementById('p-manage-stock').onchange = (e) => {
                document.getElementById('stock-qty-container').style.display = e.target.checked ? 'block' : 'none';
            };
        }

        const closeModal = () => modal.classList.add('hidden');

        if (btnAdd) btnAdd.onclick = () => openModal();
        if (btnAddEmpty) btnAddEmpty.onclick = () => openModal();
        if (btnClose) btnClose.onclick = closeModal;
        if (btnCancel) btnCancel.onclick = closeModal;

        // REMOVED backdrop click close to prevent accidental data loss
        // modal.onclick = (e) => { if (e.target === modal) closeModal(); };

        // Calculator Logic
        const updateCalc = () => {
            const costInput = document.getElementById('p-cost');
            const marginInput = document.getElementById('p-margin');
            if (!costInput || !marginInput) return;

            const cost = parseFloat(costInput.value) || 0;
            const margin = parseInt(marginInput.value) || 0;
            
            const finalPrice = cost * (1 + margin / 100);
            const profit = finalPrice - cost;
            const roi = cost > 0 ? (profit / cost * 100).toFixed(0) : 0;

            const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            
            document.getElementById('margin-label').innerText = `${margin}%`;
            document.getElementById('display-price').innerText = fmt(finalPrice);
            document.getElementById('val-cost').innerText = fmt(cost);
            document.getElementById('val-profit').innerText = fmt(profit);
            document.getElementById('roi-text').innerText = `${roi}% ROI`;
            document.getElementById('roi-bar').style.width = `${Math.min(100, roi / 2)}%`;
        };

        ['p-cost', 'p-margin'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.oninput = updateCalc;
        });

        // CRUD Actions
        window.editProduct = (id) => openModal(id);
        
        window.duplicateProduct = (id) => {
            const products = DB.get('products') || [];
            const p = products.find(item => item.id === id);
            if (p) {
                const newP = JSON.parse(JSON.stringify(p));
                newP.id = crypto.randomUUID();
                newP.name = `${p.name} (Cópia)`;
                products.unshift(newP);
                DB.save('products', products);
                import('../app.js').then(m => m.default.toast('Produto duplicado com sucesso!'));
                Products.render(container);
            }
        };

        window.deleteProduct = (id) => {
            import('../app.js').then(m => {
                const quotes = DB.get('quotes') || [];
                const orders = DB.get('orders') || [];
                const products = DB.get('products') || [];
                const prod = products.find(p => p.id === id);
                
                const inUse = quotes.some(q => q.productName === prod?.name) || orders.some(o => o.productName === prod?.name);
                
                if (inUse) {
                    m.default.confirm({
                        title: 'Ação Bloqueada (Dado em uso)',
                        message: 'Não é possível excluir este item porque ele já foi utilizado em vendas/orçamentos. Você pode apenas desativá-lo.',
                        type: 'warning',
                        confirmLabel: 'Desativar Produto',
                        onConfirm: () => {
                            if (prod) prod.status = false;
                            DB.save('products', products);
                            m.default.toast('Produto desativado com sucesso.', 'info');
                            Products.render(container);
                        }
                    });
                    return;
                }

                m.default.confirm({
                    title: 'Excluir Produto?',
                    message: 'Tem certeza que deseja remover este produto do catálogo definitivamente?',
                    type: 'danger',
                    onConfirm: () => {
                        DB.save('products', products.filter(p => p.id !== id));
                        m.default.toast('Produto removido', 'info');
                        Products.render(container);
                    }
                });
            });
        };

        form.onsubmit = (e) => {
            e.preventDefault();
            const cost = parseFloat(document.getElementById('p-cost').value) || 0;
            const margin = parseInt(document.getElementById('p-margin').value) || 0;
            const price = cost * (1 + margin / 100);

            const generateId = () => {
                try { return crypto.randomUUID(); } 
                catch (e) { return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15); }
            };

            const products = DB.get('products') || [];
            const data = {
                id: editingId || generateId(),
                name: document.getElementById('p-name').value,
                ref: document.getElementById('p-ref').value,
                category: document.getElementById('p-category').value,
                type: document.getElementById('p-type').value,
                cost: cost,
                price: price,
                status: true,
                manageStock: document.getElementById('p-manage-stock').checked,
                stock: parseInt(document.getElementById('p-stock').value) || 0,
                variations: currentVariations.filter(v => v.name.trim() !== '')
            };

            if (editingId) {
                const idx = products.findIndex(p => p.id === editingId);
                products[idx] = data;
            } else {
                products.unshift(data);
            }

            DB.save('products', products);
            import('../app.js').then(m => m.default.toast('Produto salvo com sucesso!'));
            closeModal();
            Products.render(container);
        };
    }
};

export default Products;
