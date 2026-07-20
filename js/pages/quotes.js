import DB from '../db.js';
import App from '../app.js';
import { fmtBRL } from '../utils.js';

const Quotes = {
    currentItems: [],
    _outsideClickHandler: null,

    render: (c) => {
        Quotes.currentItems = []; // Always start empty
        c.innerHTML = `
<div class="w-full max-w-[1440px] mx-auto flex flex-col xl:flex-row gap-8 pb-24 md:pb-10 animate-fadeIn">
    <!-- Left Column (70%) -->
    <div class="w-full xl:w-[70%] flex flex-col gap-6">
        <!-- Header -->
        <header>
            <div class="flex items-center gap-3 mb-2">
                <button id="btn-back" class="text-outline hover:text-primary transition-colors">
                    <span class="material-symbols-outlined">arrow_back</span>
                </button>
                <h2 class="text-headline-xl font-headline-xl text-on-surface">Novo Orçamento</h2>
            </div>
            <p class="text-body-lg font-body-lg text-on-surface-variant ml-10">Monte uma proposta comercial completa</p>
        </header>

        <!-- Customer Selection Area -->
        <section class="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(109,40,255,0.04)] p-6 border border-outline-variant/30">
            <div class="flex flex-col md:flex-row gap-4 items-end">
                <div class="flex-1 w-full">
                    <label class="block text-label-md font-label-md text-on-surface-variant mb-2">Cliente</label>
                    <div class="relative">
                        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                        <input id="input-customer" class="w-full pl-10 pr-4 py-2 border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-container/20 text-body-md font-body-md text-on-surface bg-surface-container-lowest transition-all" placeholder="Buscar cliente por nome ou CNPJ..." type="text" autocomplete="off"/>
                        <div id="customer-dropdown" class="hidden absolute w-full mt-1 bg-surface-container-lowest border border-outline-variant/30 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"></div>
                    </div>
                </div>
                <div class="w-full md:w-48">
                    <label class="block text-label-md font-label-md text-on-surface-variant mb-2">WhatsApp</label>
                    <input id="input-whatsapp" class="w-full px-4 py-2 border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-container/20 text-body-md font-body-md text-on-surface bg-surface-container-lowest transition-all" placeholder="(00) 00000-0000" type="text"/>
                </div>
                <button id="btn-new-customer" class="w-full md:w-auto px-4 py-2 bg-surface-variant text-primary rounded-lg font-label-md text-label-md hover:bg-surface-dim transition-colors flex items-center justify-center gap-2 whitespace-nowrap">
                    <span class="material-symbols-outlined text-[18px]">person_add</span>
                    Novo Cliente
                </button>
            </div>
        </section>

        <!-- Action Bar -->
        <div class="flex flex-wrap gap-3">
            <button id="btn-add-product" class="px-5 py-2.5 bg-gradient-to-r from-primary to-secondary text-on-primary rounded-lg font-label-md text-label-md shadow-[0px_10px_30px_rgba(109,40,255,0.08)] hover:opacity-90 transition-opacity flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px]">add</span>
                Produto do Catálogo
            </button>
            <button id="btn-add-item" class="px-5 py-2.5 bg-surface-variant text-primary rounded-lg font-label-md text-label-md hover:bg-surface-dim transition-colors flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px]">add</span>
                Item Avulso
            </button>
            <button id="btn-add-service" class="px-5 py-2.5 bg-surface-variant text-primary rounded-lg font-label-md text-label-md hover:bg-surface-dim transition-colors flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px]">add</span>
                Serviço
            </button>
        </div>

        <!-- Itens do Pedido Area -->
        <section class="flex flex-col gap-4">
            <h3 class="text-headline-md font-headline-md text-on-surface">Itens do Pedido</h3>
            
            <div id="quotes-items-container" class="flex flex-col gap-4">
                ${Quotes.renderItems()}
            </div>
            
            <div id="empty-state" class="hidden border-2 border-dashed border-outline-variant rounded-xl p-10 flex flex-col items-center justify-center text-center bg-surface-container-lowest/50">
                <span class="material-symbols-outlined text-outline text-display-lg mb-2">inventory_2</span>
                <p class="text-body-md font-body-md text-on-surface-variant">Nenhum item adicionado ainda.<br>Clique nos botões acima para começar.</p>
            </div>
        </section>

        <!-- Extras Area -->
        <section class="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(109,40,255,0.04)] p-6 border border-outline-variant/30 mt-4">
            <h3 class="text-headline-md font-headline-md text-on-surface mb-6">Extras do Pedido</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="flex flex-col gap-4">
                    <div>
                        <label class="block text-label-md font-label-md text-on-surface-variant mb-2">Frete (R$)</label>
                        <input id="input-freight" class="w-full px-4 py-2 border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-container/20 text-body-md font-body-md text-on-surface bg-surface-container-lowest transition-all" placeholder="0,00" type="number" step="0.01"/>
                    </div>
                    <div>
                        <label class="block text-label-md font-label-md text-on-surface-variant mb-2">Taxa de Urgência (R$)</label>
                        <input id="input-urgency" class="w-full px-4 py-2 border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-container/20 text-body-md font-body-md text-on-surface bg-surface-container-lowest transition-all" placeholder="0,00" type="number" step="0.01"/>
                    </div>
                    <div>
                        <label class="block text-label-md font-label-md text-on-surface-variant mb-2">Instalação / Arte (R$)</label>
                        <input id="input-art" class="w-full px-4 py-2 border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-container/20 text-body-md font-body-md text-on-surface bg-surface-container-lowest transition-all" placeholder="0,00" type="number" step="0.01"/>
                    </div>
                </div>
                <div class="flex flex-col gap-4">
                    <div>
                        <label class="block text-label-md font-label-md text-on-surface-variant mb-2">Desconto (%)</label>
                        <input id="input-discount" class="w-full px-4 py-2 border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-container/20 text-body-md font-body-md text-on-surface bg-surface-container-lowest transition-all" placeholder="0" type="number" min="0" max="100"/>
                    </div>
                    <div class="flex-1">
                        <label class="block text-label-md font-label-md text-on-surface-variant mb-2">Observações Gerais (Impressas no orçamento)</label>
                        <textarea id="input-notes" class="w-full px-4 py-2 border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-container/20 text-body-md font-body-md text-on-surface bg-surface-container-lowest transition-all resize-none h-full" placeholder="Adicione notas, condições de pagamento..." rows="4"></textarea>
                    </div>
                </div>
            </div>
        </section>
    </div>

    <!-- Right Column (30% Fixed Sidebar) -->
    <div class="w-full xl:w-[30%]">
        <div class="sticky top-10 flex flex-col gap-6">
            <!-- Order Summary Card -->
            <div class="bg-surface-container-lowest rounded-xl shadow-[0px_10px_30px_rgba(109,40,255,0.08)] border border-outline-variant/30 overflow-hidden">
                <div class="p-6 bg-surface-variant/30 border-b border-outline-variant/30">
                    <h3 class="text-headline-md font-headline-md text-on-surface">Resumo do Pedido</h3>
                </div>
                <div class="p-6 flex flex-col gap-4">
                    <!-- Item List -->
                    <div id="summary-items" class="flex flex-col gap-2 pb-4 border-b border-outline-variant/30">
                        <!-- Items will be injected here dynamically -->
                        <span class="text-body-sm font-body-sm text-outline italic">Nenhum item adicionado</span>
                    </div>
                    
                    <!-- Subtotals -->
                    <div class="flex flex-col gap-2 pb-4 border-b border-outline-variant/30">
                        <div class="flex justify-between items-center">
                            <span class="text-body-md font-body-md text-on-surface-variant">Subtotal</span>
                            <span id="summary-subtotal" class="text-body-md font-body-md text-on-surface font-medium">R$ 0,00</span>
                        </div>
                        <div class="flex justify-between items-center text-outline">
                            <span class="text-body-sm font-body-sm">Desconto</span>
                            <span id="summary-discount" class="text-body-sm font-body-sm">- R$ 0,00</span>
                        </div>
                        <div class="flex justify-between items-center text-outline">
                            <span class="text-body-sm font-body-sm">Frete/Adicionais</span>
                            <span id="summary-freight" class="text-body-sm font-body-sm">+ R$ 0,00</span>
                        </div>
                    </div>
                    
                    <!-- Total -->
                    <div class="pt-2">
                        <div class="flex justify-between items-end mb-1">
                            <span class="text-headline-md font-headline-md text-on-surface">Total</span>
                            <span id="summary-total" class="text-display-lg font-display-lg font-black text-primary leading-none">R$ 0,00</span>
                        </div>
                        <div class="flex items-center gap-1 text-secondary mt-2">
                            <span class="material-symbols-outlined text-[16px]">schedule</span>
                            <span class="text-label-md font-label-md">Prazo Total: 3 a 5 dias úteis</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Fixed Action Buttons -->
            <div class="flex flex-col gap-3">
                <button id="btn-generate" class="w-full py-3 bg-gradient-to-r from-primary to-secondary text-on-primary rounded-lg font-headline-md text-body-md font-bold shadow-[0px_10px_30px_rgba(109,40,255,0.08)] hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined">receipt_long</span>
                    Gerar Pedido
                </button>
                <div class="grid grid-cols-2 gap-3">
                    <button id="btn-whatsapp" class="py-2.5 bg-[#25D366]/10 text-[#075E54] hover:bg-[#25D366]/20 rounded-lg font-label-md text-label-md transition-colors flex items-center justify-center gap-2 border border-[#25D366]/30">
                        <span class="material-symbols-outlined text-[18px]">chat</span>
                        WhatsApp
                    </button>
                    <button id="btn-pdf" class="py-2.5 bg-surface-variant text-primary hover:bg-surface-dim rounded-lg font-label-md text-label-md transition-colors flex items-center justify-center gap-2">
                        <span class="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                        PDF
                    </button>
                </div>
                <button id="btn-save" class="w-full py-2.5 bg-transparent border border-outline-variant text-on-surface-variant hover:bg-surface-variant rounded-lg font-label-md text-label-md transition-colors flex items-center justify-center gap-2 mt-2">
                    <span class="material-symbols-outlined text-[18px]">save</span>
                    Salvar Rascunho
                </button>
            </div>
        </div>
            </div>
        </div>
    </div>
</div>

<!-- CUSTOMER MODAL (From Quotes Page) -->
<div id="quote-customer-modal" class="hidden fixed inset-0 z-[100] flex items-center justify-center p-4" style="background:rgba(10,10,20,0.5); backdrop-filter:blur(8px);">
    <div class="bg-surface-container-lowest rounded-xl shadow-[0px_10px_30px_rgba(109,40,255,0.08)] border border-outline-variant/30 w-full max-w-[440px] overflow-hidden">
        <div class="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center">
            <h3 class="text-headline-md font-headline-md text-on-surface">Novo Cliente</h3>
            <button id="close-quote-customer-modal" class="w-8 h-8 flex items-center justify-center rounded-full text-outline hover:bg-surface-variant hover:text-primary transition-colors">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
        <form id="form-quote-customer" class="p-6 space-y-4">
            <div>
                <label class="block text-label-md font-label-md text-on-surface-variant mb-1">Nome Completo / Razão Social</label>
                <input type="text" id="qc-name" class="w-full px-4 py-2 border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-container/20 text-body-md font-body-md text-on-surface bg-surface-container-lowest" placeholder="Ex: João da Silva">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-label-md font-label-md text-on-surface-variant mb-1">Documento (CPF/CNPJ)</label>
                    <input type="text" id="qc-doc" class="w-full px-4 py-2 border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-container/20 text-body-md font-body-md text-on-surface bg-surface-container-lowest" placeholder="000.000.000-00">
                </div>
                <div>
                    <label class="block text-label-md font-label-md text-on-surface-variant mb-1">Data de Nascimento</label>
                    <input type="date" id="qc-birth" class="w-full px-4 py-2 border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-container/20 text-body-md font-body-md text-on-surface bg-surface-container-lowest">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-label-md font-label-md text-on-surface-variant mb-1">E-mail</label>
                    <input type="email" id="qc-email" class="w-full px-4 py-2 border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-container/20 text-body-md font-body-md text-on-surface bg-surface-container-lowest" placeholder="cliente@email.com">
                </div>
                <div>
                    <label class="block text-label-md font-label-md text-on-surface-variant mb-1">WhatsApp</label>
                    <input type="text" id="qc-phone" class="w-full px-4 py-2 border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-container/20 text-body-md font-body-md text-on-surface bg-surface-container-lowest" placeholder="(00) 00000-0000">
                </div>
            </div>
            <div class="flex justify-end gap-3 pt-4">
                <button type="button" id="btn-cancel-quote-customer" class="px-4 py-2 bg-transparent border border-outline-variant text-on-surface-variant hover:bg-surface-variant rounded-lg font-label-md font-semibold transition-colors">Cancelar</button>
                <button type="submit" class="px-4 py-2 bg-gradient-to-r from-primary to-secondary text-on-primary rounded-lg font-label-md font-semibold hover:opacity-90 transition-opacity">Salvar Cliente</button>
            </div>
        </form>
    </div>
</div>
<!-- PRODUCT CATALOG MODAL -->
<div id="quote-product-modal" class="hidden fixed inset-0 z-[100] flex items-center justify-center p-4" style="background:rgba(10,10,20,0.5); backdrop-filter:blur(8px);">
    <div class="bg-surface-container-lowest rounded-xl shadow-[0px_10px_30px_rgba(109,40,255,0.08)] border border-outline-variant/30 w-full max-w-[800px] max-h-[90vh] flex flex-col overflow-hidden">
        <div class="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low">
            <h3 class="text-headline-md font-headline-md text-on-surface flex items-center gap-2"><span class="material-symbols-outlined text-primary">inventory_2</span> Catálogo de Produtos</h3>
            <button id="close-quote-product-modal" class="w-8 h-8 flex items-center justify-center rounded-full text-outline hover:bg-surface-variant hover:text-primary transition-colors">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
        <div class="p-4 border-b border-outline-variant/30">
             <div class="relative">
                <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                <input id="search-product-catalog" class="w-full pl-10 pr-4 py-2 border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-container/20 text-body-md font-body-md text-on-surface bg-surface-container-lowest transition-all" placeholder="Buscar produto..." type="text">
            </div>
        </div>
        <div class="flex-1 overflow-y-auto p-4 bg-surface" id="quote-product-list">
            <!-- Products will be listed here -->
        </div>
    </div>
</div>

<!-- CUSTOM ITEM MODAL -->
<div id="quote-custom-item-modal" class="hidden fixed inset-0 z-[100] flex items-center justify-center p-4" style="background:rgba(10,10,20,0.5); backdrop-filter:blur(8px);">
    <div class="bg-surface-container-lowest rounded-xl shadow-[0px_10px_30px_rgba(109,40,255,0.08)] border border-outline-variant/30 w-full max-w-[440px] overflow-hidden">
        <div class="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center">
            <h3 class="text-headline-md font-headline-md text-on-surface" id="custom-item-modal-title">Item Avulso</h3>
            <button id="close-custom-item-modal" class="w-8 h-8 flex items-center justify-center rounded-full text-outline hover:bg-surface-variant hover:text-primary transition-colors">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
        <form id="form-custom-item" class="p-6 space-y-4">
            <div>
                <label class="block text-label-md font-label-md text-on-surface-variant mb-1">Descrição</label>
                <input type="text" id="ci-name" required class="w-full px-4 py-2 border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-container/20 text-body-md font-body-md text-on-surface bg-surface-container-lowest" placeholder="Ex: Criação de Logo">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-label-md font-label-md text-on-surface-variant mb-1">Quantidade</label>
                    <input type="number" id="ci-qty" required min="1" value="1" class="w-full px-4 py-2 border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-container/20 text-body-md font-body-md text-on-surface bg-surface-container-lowest">
                </div>
                <div>
                    <label class="block text-label-md font-label-md text-on-surface-variant mb-1">Valor Unitário (R$)</label>
                    <input type="number" id="ci-price" required step="0.01" min="0" class="w-full px-4 py-2 border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-container/20 text-body-md font-body-md text-on-surface bg-surface-container-lowest" placeholder="0.00">
                </div>
            </div>
            <div class="flex justify-end gap-3 pt-4">
                <button type="button" id="btn-cancel-custom-item" class="px-4 py-2 bg-transparent border border-outline-variant text-on-surface-variant hover:bg-surface-variant rounded-lg font-label-md font-semibold transition-colors">Cancelar</button>
                <button type="submit" class="px-4 py-2 bg-gradient-to-r from-primary to-secondary text-on-primary rounded-lg font-label-md font-semibold hover:opacity-90 transition-opacity">Adicionar Item</button>
            </div>
        </form>
    </div>
</div>
        `;
        
        Quotes.bindEvents(c);
        Quotes.updateSummary();
    },

    renderItems: () => {
        if (Quotes.currentItems.length === 0) return '';
        
        return Quotes.currentItems.map(item => `
            <!-- Item Card -->
            <div class="quote-item-card bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(109,40,255,0.04)] border border-outline-variant/30 group hover:shadow-[0px_10px_30px_rgba(109,40,255,0.08)] transition-shadow" data-id="${item.id}">
                <div class="p-6 flex flex-col md:flex-row gap-6">
                    <!-- Reorder Handle -->
                    <div class="hidden md:flex items-center text-outline-variant cursor-grab hover:text-outline transition-colors">
                        <span class="material-symbols-outlined">drag_indicator</span>
                    </div>
                    
                    <!-- Item Details -->
                    <div class="flex-1">
                        <div class="flex items-start justify-between mb-2">
                            <div>
                                <h4 class="text-headline-md font-headline-md text-on-surface">${item.name}</h4>
                                <span class="inline-block mt-1 px-2 py-0.5 bg-surface-variant text-tertiary rounded font-label-md text-label-md">${item.category}</span>
                            </div>
                            <div class="text-right">
                                <div class="text-headline-lg font-headline-lg text-primary font-bold">${fmtBRL(item.price)}</div>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 bg-surface-container-low p-4 rounded-lg">
                            <div>
                                <span class="block text-label-md font-label-md text-on-surface-variant">Quantidade</span>
                                <span class="text-body-md font-body-md font-semibold">${item.quantity}</span>
                            </div>
                            <div>
                                <span class="block text-label-md font-label-md text-on-surface-variant">Material</span>
                                <span class="text-body-md font-body-md">${item.material}</span>
                            </div>
                            <div>
                                <span class="block text-label-md font-label-md text-on-surface-variant">Cores</span>
                                <span class="text-body-md font-body-md">${item.colors}</span>
                            </div>
                            <div>
                                <span class="block text-label-md font-label-md text-on-surface-variant">Acabamento</span>
                                <span class="text-body-md font-body-md">${item.finish}</span>
                            </div>
                            <div>
                                <span class="block text-label-md font-label-md text-on-surface-variant">Prazo Produção</span>
                                <span class="text-body-md font-body-md text-secondary font-semibold">${item.deadline}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Card Actions -->
                <div class="bg-surface-container-low px-6 py-3 border-t border-outline-variant/30 flex justify-end gap-2 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="btn-edit-item p-2 text-outline hover:text-primary transition-colors rounded-lg hover:bg-surface-variant" title="Editar">
                        <span class="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button class="btn-duplicate-item p-2 text-outline hover:text-primary transition-colors rounded-lg hover:bg-surface-variant" title="Duplicar">
                        <span class="material-symbols-outlined text-[20px]">content_copy</span>
                    </button>
                    <button class="btn-delete-item p-2 text-outline hover:text-error transition-colors rounded-lg hover:bg-error-container" title="Excluir">
                        <span class="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                </div>
            </div>
        `).join('');
    },

    bindEvents: (container) => {
        // Toolbar buttons
        container.querySelector('#btn-back')?.addEventListener('click', () => {
            App.confirm({
                title: 'Sair sem salvar?',
                message: 'Deseja sair sem salvar o orçamento?',
                type: 'warning',
                confirmLabel: 'Sim, sair',
                onConfirm: () => App.navigateTo('dashboard')
            });
        });

        // Customer Autocomplete Logic
        const inputCustomer = container.querySelector('#input-customer');
        const inputWhatsapp = container.querySelector('#input-whatsapp');
        const dropdown = container.querySelector('#customer-dropdown');
        
        if (inputCustomer && dropdown) {
            inputCustomer.addEventListener('input', (e) => {
                const val = e.target.value.toLowerCase();
                if (!val) {
                    dropdown.classList.add('hidden');
                    return;
                }

                const customers = DB.get('customers') || [];
                const matches = customers.filter(c => 
                    c.name.toLowerCase().includes(val) || 
                    (c.document && c.document.includes(val))
                );
                
                if (matches.length > 0) {
                    dropdown.innerHTML = matches.map(c => `
                        <div class="px-4 py-3 hover:bg-surface-variant cursor-pointer border-b border-outline-variant/10 last:border-0" data-id="${c.id}">
                            <div class="font-semibold text-on-surface text-body-md">${c.name}</div>
                            <div class="text-xs text-on-surface-variant">${c.document || 'Sem documento'} • ${c.phone || 'Sem telefone'}</div>
                        </div>
                    `).join('');
                    dropdown.classList.remove('hidden');
                } else {
                    dropdown.innerHTML = `<div class="px-4 py-3 text-sm text-outline italic">Nenhum cliente encontrado</div>`;
                    dropdown.classList.remove('hidden');
                }
            });

            // Seleção de cliente (listener único delegado, em vez de um por linha a cada tecla)
            dropdown.addEventListener('click', (e) => {
                const row = e.target.closest('div[data-id]');
                if (!row) return;
                const selected = (DB.get('customers') || []).find(c => String(c.id) === String(row.dataset.id));
                if (selected) {
                    inputCustomer.value = selected.name;
                    if (inputWhatsapp) inputWhatsapp.value = selected.phone || '';
                    inputCustomer.dataset.customerId = selected.id;
                    dropdown.classList.add('hidden');
                }
            });

            // Close dropdown when clicking outside (remove previous handler to avoid stacking across re-renders)
            if (Quotes._outsideClickHandler) document.removeEventListener('click', Quotes._outsideClickHandler);
            Quotes._outsideClickHandler = (e) => {
                if (!inputCustomer.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.classList.add('hidden');
                }
            };
            document.addEventListener('click', Quotes._outsideClickHandler);
        }
        
        // Customer Modal Logic
        const modal = container.querySelector('#quote-customer-modal');
        const form = container.querySelector('#form-quote-customer');
        const btnNewCustomer = container.querySelector('#btn-new-customer');
        const btnCloseModal = container.querySelector('#close-quote-customer-modal');
        const btnCancelModal = container.querySelector('#btn-cancel-quote-customer');

        const openModal = () => {
            form.reset();
            modal.classList.remove('hidden');
        };

        const closeModal = () => modal.classList.add('hidden');

        btnNewCustomer?.addEventListener('click', openModal);
        btnCloseModal?.addEventListener('click', closeModal);
        btnCancelModal?.addEventListener('click', closeModal);

        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            const customers = DB.get('customers') || [];
            const newCustomer = {
                id: crypto.randomUUID(),
                name: document.getElementById('qc-name').value || 'Cliente sem nome',
                document: document.getElementById('qc-doc').value,
                birth: document.getElementById('qc-birth').value,
                email: document.getElementById('qc-email').value,
                phone: document.getElementById('qc-phone').value
            };
            customers.unshift(newCustomer);
            DB.save('customers', customers);
            
            // Set input values to the newly created customer
            const inputCustomer = container.querySelector('#input-customer');
            const inputWhatsapp = container.querySelector('#input-whatsapp');
            if (inputCustomer) inputCustomer.value = newCustomer.name;
            if (inputWhatsapp) inputWhatsapp.value = newCustomer.phone;
            
            App.toast('Cliente adicionado com sucesso!', 'success');
            closeModal();
        });
        
        // Product Catalog Logic
        const productModal = container.querySelector('#quote-product-modal');
        const productList = container.querySelector('#quote-product-list');
        const searchProduct = container.querySelector('#search-product-catalog');

        const renderProductCatalog = (filter = '') => {
            const products = DB.get('products') || [];
            const filtered = products.filter(p => p.status && (p.name.toLowerCase().includes(filter) || (p.category && p.category.toLowerCase().includes(filter))));
            
            if (filtered.length === 0) {
                productList.innerHTML = `<p class="text-center text-outline italic py-8">Nenhum produto encontrado.</p>`;
                return;
            }

            productList.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">` + filtered.map(p => `
                <div class="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-4 flex flex-col justify-between hover:shadow-[0px_4px_12px_rgba(109,40,255,0.08)] transition-shadow cursor-pointer" data-id="${p.id}">
                    <div class="flex gap-3 mb-3">
                        <div class="w-12 h-12 rounded-lg bg-surface-variant flex-shrink-0 overflow-hidden">
                            <img src="${p.image || 'https://via.placeholder.com/100?text=📦'}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/100?text=📦'">
                        </div>
                        <div>
                            <h4 class="font-bold text-on-surface text-sm leading-tight">${p.name}</h4>
                            <span class="text-[10px] bg-surface-variant text-on-surface-variant px-1.5 py-0.5 rounded mt-1 inline-block">${p.category || 'Geral'}</span>
                        </div>
                    </div>
                    <div class="flex justify-between items-center mt-2 pt-2 border-t border-outline-variant/20">
                        <span class="font-black text-primary">${fmtBRL(p.price)}</span>
                        <span class="material-symbols-outlined text-outline-variant hover:text-primary transition-colors">add_circle</span>
                    </div>
                </div>
            `).join('') + `</div>`;
        };

        const addProductToQuote = (id) => {
            const products = DB.get('products') || [];
            const p = products.find(item => item.id === id);
            if (p) {
                Quotes.currentItems.push({
                    id: Date.now(),
                    name: p.name,
                    category: p.category || 'Catálogo',
                    price: parseFloat(p.price) || 0,
                    quantity: 1,
                    material: '-',
                    colors: '-',
                    finish: '-',
                    deadline: 'Padrão'
                });
                Quotes.refreshItems(container);
                productModal.classList.add('hidden');
                App.toast('Produto adicionado', 'success');
            }
        };

        // Clique nos cards do catálogo (delegado, sem depender de window.*)
        productList?.addEventListener('click', (e) => {
            const card = e.target.closest('[data-id]');
            if (card) addProductToQuote(card.dataset.id);
        });

        container.querySelector('#btn-add-product')?.addEventListener('click', () => {
            renderProductCatalog();
            searchProduct.value = '';
            productModal.classList.remove('hidden');
        });

        searchProduct?.addEventListener('input', (e) => {
            renderProductCatalog(e.target.value.toLowerCase());
        });

        container.querySelector('#close-quote-product-modal')?.addEventListener('click', () => {
            productModal.classList.add('hidden');
        });

        // Custom Item / Service Logic
        const customItemModal = container.querySelector('#quote-custom-item-modal');
        const formCustomItem = container.querySelector('#form-custom-item');
        let isService = false;

        const openCustomItemModal = (service) => {
            isService = service;
            formCustomItem.reset();
            container.querySelector('#custom-item-modal-title').innerText = service ? 'Novo Serviço' : 'Item Avulso';
            customItemModal.classList.remove('hidden');
        };

        const closeCustomItemModal = () => customItemModal.classList.add('hidden');

        container.querySelector('#btn-add-item')?.addEventListener('click', () => openCustomItemModal(false));
        container.querySelector('#btn-add-service')?.addEventListener('click', () => openCustomItemModal(true));
        container.querySelector('#close-custom-item-modal')?.addEventListener('click', closeCustomItemModal);
        container.querySelector('#btn-cancel-custom-item')?.addEventListener('click', closeCustomItemModal);

        formCustomItem?.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('ci-name').value;
            const qty = parseInt(document.getElementById('ci-qty').value) || 1;
            const price = parseFloat(document.getElementById('ci-price').value) || 0;
            
            Quotes.currentItems.push({
                id: Date.now(),
                name: name,
                category: isService ? 'Serviço' : 'Avulso',
                price: price * qty,
                quantity: qty,
                material: '-',
                colors: '-',
                finish: '-',
                deadline: '-'
            });
            Quotes.refreshItems(container);
            closeCustomItemModal();
            App.toast('Item adicionado', 'success');
        });

        // Extras inputs -> update summary
        ['input-freight', 'input-urgency', 'input-art', 'input-discount'].forEach(id => {
            container.querySelector(`#${id}`)?.addEventListener('input', Quotes.updateSummary);
        });

        // Generate Order / Save Quote Logic
        const generateOrder = (status) => {
            const customerInput = container.querySelector('#input-customer');
            const customerName = customerInput.value.trim();
            if (!customerName) {
                App.toast('Informe o cliente primeiro', 'error');
                return;
            }
            if (Quotes.currentItems.length === 0) {
                App.toast('Adicione pelo menos um item', 'error');
                return;
            }
            
            const { total } = Quotes.computeTotals();

            const orders = DB.get('orders') || [];
            const quotes = DB.get('quotes') || [];
            
            const newOrder = {
                id: `ORD-${Date.now().toString(36).toUpperCase()}`,
                date: new Date().toISOString().split('T')[0],
                customerId: customerInput.dataset.customerId || null,
                customerName: customerName,
                productName: Quotes.currentItems.map(i => i.name).join(', '),
                value: total,
                status: status, // 'Aberto' for Quote, 'Aguardando Arte' for Order
                items: Quotes.currentItems,
                notes: document.getElementById('input-notes')?.value || ''
            };
            
            if (status === 'Aberto') {
                quotes.push(newOrder);
                DB.save('quotes', quotes);
                App.toast('Rascunho salvo com sucesso', 'success');
                App.navigateTo('dashboard');
            } else {
                orders.unshift(newOrder);
                DB.save('orders', orders);
                App.toast('Pedido gerado! Movido para Produção.', 'success');
                App.navigateTo('producao');
            }
        };

        container.querySelector('#btn-generate')?.addEventListener('click', () => {
            generateOrder('Aguardando Arte');
        });
        
        container.querySelector('#btn-save')?.addEventListener('click', () => {
            generateOrder('Aberto');
        });

        container.querySelector('#btn-whatsapp')?.addEventListener('click', () => {
            App.toast('Compartilhar no WhatsApp (Em desenvolvimento)', 'info');
        });
        
        container.querySelector('#btn-pdf')?.addEventListener('click', () => {
            App.toast('Gerando PDF...', 'info');
        });

        // Item cards actions (listener único delegado — sobrevive aos re-renders do container)
        container.querySelector('#quotes-items-container')?.addEventListener('click', (e) => {
            const card = e.target.closest('.quote-item-card');
            if (!card) return;
            const id = parseInt(card.dataset.id);

            if (e.target.closest('.btn-delete-item')) {
                Quotes.currentItems = Quotes.currentItems.filter(i => i.id !== id);
                Quotes.refreshItems(container);
                App.toast('Item removido', 'success');
            } else if (e.target.closest('.btn-duplicate-item')) {
                const itemToCopy = Quotes.currentItems.find(i => i.id === id);
                if (itemToCopy) {
                    Quotes.currentItems.push({ ...itemToCopy, id: Date.now() });
                    Quotes.refreshItems(container);
                    App.toast('Item duplicado', 'success');
                }
            } else if (e.target.closest('.btn-edit-item')) {
                App.toast('Editar item (Em desenvolvimento)', 'info');
            }
        });
    },

    refreshItems: (container) => {
        const itemsContainer = container.querySelector('#quotes-items-container');
        const emptyState = container.querySelector('#empty-state');
        
        if (Quotes.currentItems.length > 0) {
            itemsContainer.innerHTML = Quotes.renderItems();
            itemsContainer.classList.remove('hidden');
            emptyState.classList.add('hidden');
        } else {
            itemsContainer.innerHTML = '';
            itemsContainer.classList.add('hidden');
            emptyState.classList.remove('hidden');
        }
        
        Quotes.updateSummary();
    },

    // Fonte única do cálculo de preço do orçamento (usada pelo resumo e pela gravação do pedido)
    computeTotals: () => {
        const getValue = (id) => parseFloat(document.getElementById(id)?.value) || 0;
        const subtotal = Quotes.currentItems.reduce((acc, item) => acc + (parseFloat(item.price) || 0), 0);
        const freight = getValue('input-freight');
        const urgency = getValue('input-urgency');
        const art = getValue('input-art');
        const extras = freight + urgency + art;
        const discount = (subtotal * getValue('input-discount')) / 100;
        return { subtotal, freight, urgency, art, extras, discount, total: subtotal + extras - discount };
    },

    updateSummary: () => {
        const { subtotal, freight, urgency, art, discount, total } = Quotes.computeTotals();

        const summarySubtotal = document.getElementById('summary-subtotal');
        const summaryFreight = document.getElementById('summary-freight');
        const summaryDiscount = document.getElementById('summary-discount');
        const summaryTotal = document.getElementById('summary-total');
        const summaryItemsContainer = document.getElementById('summary-items');

        if (summaryItemsContainer) {
            if (Quotes.currentItems.length === 0 && art === 0) {
                summaryItemsContainer.innerHTML = `<span class="text-body-sm font-body-sm text-outline italic">Nenhum item adicionado</span>`;
            } else {
                let html = Quotes.currentItems.map(item => `
                    <div class="flex justify-between items-start">
                        <span class="text-body-sm font-body-sm text-on-surface max-w-[70%] truncate">${item.quantity}x ${item.name}</span>
                        <span class="text-body-sm font-body-sm text-on-surface font-medium">${fmtBRL(item.price)}</span>
                    </div>
                `).join('');
                
                if (art > 0) {
                    html += `
                    <div class="flex justify-between items-start">
                        <span class="text-body-sm font-body-sm text-on-surface max-w-[70%] truncate">Instalação / Arte</span>
                        <span class="text-body-sm font-body-sm text-on-surface font-medium">${fmtBRL(art)}</span>
                    </div>`;
                }
                
                summaryItemsContainer.innerHTML = html;
            }
        }

        if(summarySubtotal) summarySubtotal.innerText = fmtBRL(subtotal);
        if(summaryFreight) summaryFreight.innerText = `+ ${fmtBRL(freight + urgency)}`;
        if(summaryDiscount) summaryDiscount.innerText = `- ${fmtBRL(discount)}`;
        if(summaryTotal) summaryTotal.innerText = fmtBRL(total);
    }
};

export default Quotes;
