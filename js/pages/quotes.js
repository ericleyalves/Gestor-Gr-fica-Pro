import DB from '../db.js';
import App from '../app.js';
import { fmtBRL, addBusinessDays, isoDate, fmtShortDate, bindCepLookup } from '../utils.js';
import { esc } from '../utils.js';
import QuotePDF from '../pdf.js';
import Payments from '../payments.js';

const Quotes = {
    currentItems: [],
    _outsideClickHandler: null,

    render: (c) => {
        Quotes.currentItems = []; // Always start empty
        Quotes.discountMode = 'pct';   // 'pct' | 'value' | 'total' — qual campo de desconto foi digitado por último
        Quotes.discountInput = 0;
        Quotes.editingQuoteId = null;   // id do rascunho aberto (salvar de novo atualiza em vez de duplicar)
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
                <h2 id="quote-title" class="text-headline-xl font-headline-xl text-on-surface">Novo Orçamento</h2>
                <button id="btn-drafts" type="button" class="ml-auto px-4 py-2 rounded-lg bg-white border border-outline-variant/50 text-primary font-label-md text-label-md hover:border-primary transition-colors flex items-center gap-2">
                    <span class="material-symbols-outlined text-[18px]">folder_open</span>
                    Orçamentos salvos <span id="drafts-count" class="px-1.5 py-0.5 rounded-md bg-surface-variant text-[11px] font-black">0</span>
                </button>
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
                        <input id="input-customer" class="w-full pl-10 pr-4 py-2 border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-container/20 text-body-md font-body-md text-on-surface bg-surface-container-lowest transition-all" placeholder="Clique para ver a lista ou busque por nome ou telefone…" type="text" autocomplete="off"/>
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
                        <label class="block text-label-md font-label-md text-on-surface-variant mb-2">Desconto <span class="font-normal text-outline">— preencha qualquer um, os outros se calculam</span></label>
                        <div class="grid grid-cols-3 gap-2">
                            <div>
                                <span class="block text-[10px] font-bold uppercase text-outline mb-1">Em %</span>
                                <input id="input-discount" data-mode="pct" class="w-full px-4 py-2 border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-container/20 text-body-md font-body-md text-on-surface bg-surface-container-lowest transition-all" placeholder="0" type="number" min="0" max="100" step="0.01" inputmode="decimal"/>
                            </div>
                            <div>
                                <span class="block text-[10px] font-bold uppercase text-outline mb-1">Em R$</span>
                                <input id="input-discount-value" data-mode="value" class="w-full px-4 py-2 border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-container/20 text-body-md font-body-md text-on-surface bg-surface-container-lowest transition-all" placeholder="0,00" type="number" min="0" step="0.01" inputmode="decimal"/>
                            </div>
                            <div>
                                <span class="block text-[10px] font-bold uppercase text-primary mb-1">Fechar por (R$)</span>
                                <input id="input-final-total" data-mode="total" class="w-full px-4 py-2 border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-container/20 text-body-md font-body-md text-on-surface bg-surface-container-lowest transition-all" placeholder="Valor final" type="number" min="0" step="0.01" inputmode="decimal"/>
                            </div>
                        </div>
                        <p id="discount-hint" class="text-xs mt-2 hidden" style="color:var(--text-muted);"></p>
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
                            <span id="summary-discount-label" class="text-body-sm font-body-sm">Desconto</span>
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
                            <span class="text-label-md font-label-md">Prazo:</span>
                            <input id="input-deadline" type="number" min="1" step="1" inputmode="numeric" title="Prazo de produção em dias úteis"
                                   style="width:58px; padding:3px 6px; text-align:center; border-radius:8px; font-size:13px; font-weight:700;">
                            <span class="text-label-md font-label-md">dias úteis</span>
                            <span id="deadline-date" class="text-xs ml-1" style="color:var(--text-faint);"></span>
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
                    Salvar Orçamento
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
            <div class="grid gap-4" style="grid-template-columns: 140px 1fr;">
                <div>
                    <label class="block text-label-md font-label-md text-on-surface-variant mb-1">CEP</label>
                    <input type="text" id="qc-cep" class="w-full px-4 py-2 border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-container/20 text-body-md font-body-md text-on-surface bg-surface-container-lowest transition-all" placeholder="00000-000" inputmode="numeric" maxlength="9">
                </div>
                <div>
                    <label class="block text-label-md font-label-md text-on-surface-variant mb-1">Endereço</label>
                    <input type="text" id="qc-address" class="w-full px-4 py-2 border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-container/20 text-body-md font-body-md text-on-surface bg-surface-container-lowest transition-all" placeholder="Rua, nº - Bairro, Cidade/UF">
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

    /** Prazo de produção (dias úteis) digitado no resumo. */
    deadlineDays: () => {
        const v = parseInt(document.getElementById('input-deadline')?.value);
        return v > 0 ? v : (parseInt((DB.get('shop_profile') || {}).defaultDeadline) || 5);
    },

    deadlineText: () => {
        const n = Quotes.deadlineDays();
        return `${n} ${n === 1 ? 'dia útil' : 'dias úteis'} (até ${fmtShortDate(addBusinessDays(new Date(), n))})`;
    },

    updateDeadlineDate: (container) => {
        const el = container.querySelector('#deadline-date');
        if (el) el.textContent = `· até ${fmtShortDate(addBusinessDays(new Date(), Quotes.deadlineDays()))}`;
    },

    /** Pergunta o prazo de produção ao gerar o pedido. */
    askDeadline: (container, onConfirm) => {
        document.getElementById('ggp-deadline-modal')?.remove();
        const start = Quotes.deadlineDays();
        const payFs = Payments.fieldset(Quotes.computeTotals().total, 0, 'dlpay');
        const el = document.createElement('div');
        el.id = 'ggp-deadline-modal';
        el.className = 'fixed inset-0 z-[120] flex items-center justify-center p-4';
        el.style.cssText = 'background:rgba(10,10,20,0.5); backdrop-filter:blur(8px);';
        el.innerHTML = `
            <div class="w-full max-w-md rounded-2xl bg-white shadow-2xl max-h-[94vh] overflow-y-auto">
                <div class="px-6 pt-6 pb-2">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:var(--primary-light); color:var(--primary);">
                            <span class="material-symbols-outlined">event</span>
                        </div>
                        <div>
                            <h3 class="text-lg font-black" style="color:var(--text-main);">Prazo de produção</h3>
                            <p class="text-xs" style="color:var(--text-faint);">Em quantos dias úteis este pedido fica pronto?</p>
                        </div>
                    </div>
                </div>
                <div class="px-6 py-4 space-y-4">
                    <div class="flex flex-wrap gap-2">
                        ${[1, 2, 3, 5, 7, 10, 15].map(n => `
                            <button type="button" data-days="${n}" class="px-3 py-2 rounded-xl border text-sm font-bold transition-all hover:border-primary">${n} ${n === 1 ? 'dia' : 'dias'}</button>`).join('')}
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label>Dias úteis</label>
                            <input type="number" id="dl-days" min="1" step="1" value="${start}" inputmode="numeric">
                        </div>
                        <div>
                            <label>ou data de entrega</label>
                            <input type="date" id="dl-date">
                        </div>
                    </div>
                    <p id="dl-hint" class="text-sm font-semibold" style="color:var(--primary);"></p>
                    <div class="pt-4 border-t" style="border-color:var(--border);">
                        <p class="text-sm font-black mb-1" style="color:var(--text-main);">Valor já recebido</p>
                        <p class="text-xs mb-3" style="color:var(--text-faint);">Sinal ou pagamento do pedido de ${fmtBRL(Quotes.computeTotals().total)}.</p>
                        ${payFs.html}
                    </div>
                </div>
                <div class="flex justify-end gap-2 px-6 py-4 border-t" style="border-color:var(--border);">
                    <button type="button" data-close class="btn-ghost">Cancelar</button>
                    <button type="button" id="dl-ok" class="btn-primary">
                        <span class="material-symbols-outlined" style="font-size:18px;">check_circle</span>
                        Gerar Pedido
                    </button>
                </div>
            </div>`;

        const daysEl = el.querySelector('#dl-days'), dateEl = el.querySelector('#dl-date'), hint = el.querySelector('#dl-hint');
        const readPayment = payFs.bind(el);
        const today = new Date(); today.setHours(12, 0, 0, 0);
        dateEl.min = isoDate(addBusinessDays(today, 1));
        /** dias úteis entre hoje e a data escolhida */
        const businessDaysUntil = (iso) => {
            const target = new Date(`${iso}T12:00:00`); let n = 0; const d = new Date(today);
            while (d < target) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) n++; }
            return n;
        };
        const sync = (from) => {
            if (from === 'date' && dateEl.value) daysEl.value = Math.max(1, businessDaysUntil(dateEl.value));
            const n = Math.max(1, parseInt(daysEl.value) || 1);
            const due = addBusinessDays(today, n);
            if (from !== 'date') dateEl.value = isoDate(due);
            el.querySelectorAll('[data-days]').forEach(b => {
                const on = Number(b.dataset.days) === n;
                b.style.background = on ? 'var(--primary)' : '';
                b.style.color = on ? '#fff' : '';
                b.style.borderColor = on ? 'var(--primary)' : 'var(--border)';
            });
            hint.textContent = `Entrega prevista: ${due.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}`;
        };
        el.querySelectorAll('[data-days]').forEach(b => b.addEventListener('click', () => { daysEl.value = b.dataset.days; sync('days'); }));
        daysEl.addEventListener('input', () => sync('days'));
        dateEl.addEventListener('change', () => sync('date'));

        const close = () => { el.remove(); document.removeEventListener('keydown', onKey); };
        const onKey = (e) => { if (e.key === 'Escape') close(); if (e.key === 'Enter' && e.target.tagName !== 'SELECT') el.querySelector('#dl-ok').click(); };
        document.addEventListener('keydown', onKey);
        el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-close]')) close(); });
        el.querySelector('#dl-ok').addEventListener('click', () => {
            const n = Math.max(1, parseInt(daysEl.value) || 1);
            const input = container.querySelector('#input-deadline');
            if (input) input.value = n;
            const payment = readPayment();
            close();
            onConfirm(n, payment);
        });
        document.body.appendChild(el);
        sync('days');
        daysEl.focus(); daysEl.select();
    },

    /** Janela com a mensagem do orçamento + botão Copiar. */
    showMessage: (text) => {
        document.getElementById('ggp-msg-modal')?.remove();
        const el = document.createElement('div');
        el.id = 'ggp-msg-modal';
        el.className = 'fixed inset-0 z-[120] flex items-center justify-center p-4';
        el.style.cssText = 'background:rgba(10,10,20,0.5); backdrop-filter:blur(8px);';
        el.innerHTML = `
            <div class="w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[88vh]">
                <div class="flex items-center justify-between px-6 py-4 border-b" style="border-color:var(--border);">
                    <div>
                        <h3 class="text-lg font-black" style="color:var(--text-main);">Mensagem do orçamento</h3>
                        <p class="text-xs" style="color:var(--text-faint);">Copie e cole na conversa do WhatsApp. Pode editar antes de copiar.</p>
                    </div>
                    <button type="button" data-close class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100" style="color:var(--text-faint);">
                        <span class="material-symbols-outlined" style="font-size:18px;">close</span>
                    </button>
                </div>
                <div class="p-5 flex-1 overflow-y-auto" style="background:#ECE5DD;">
                    <textarea id="ggp-msg-text" spellcheck="false" class="w-full resize-none" style="min-height:340px; background:#DCF8C6; border:0; border-radius:12px; padding:14px 16px; font-size:14px; line-height:1.5; color:#111; box-shadow:0 1px 1px rgba(0,0,0,.08);"></textarea>
                </div>
                <div class="flex justify-end gap-2 px-6 py-4 border-t" style="border-color:var(--border);">
                    <button type="button" data-close class="btn-ghost">Fechar</button>
                    <button type="button" id="ggp-msg-copy" class="btn-primary" style="background:#25D366;">
                        <span class="material-symbols-outlined" style="font-size:18px;">content_copy</span>
                        Copiar mensagem
                    </button>
                </div>
            </div>`;
        const ta = el.querySelector('#ggp-msg-text');
        ta.value = text;

        const close = () => { el.remove(); document.removeEventListener('keydown', onKey); };
        const onKey = (e) => { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', onKey);
        el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-close]')) close(); });

        el.querySelector('#ggp-msg-copy').addEventListener('click', async () => {
            const btn = el.querySelector('#ggp-msg-copy');
            try {
                await navigator.clipboard.writeText(ta.value);
            } catch {
                ta.select(); document.execCommand('copy');   // alternativa se o navegador bloquear
            }
            btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px;">check</span> Copiado!`;
            App.toast('Mensagem copiada! Cole na conversa do cliente.', 'success');
            setTimeout(close, 900);
        });
        document.body.appendChild(el);
        ta.focus();
        ta.setSelectionRange(0, 0);
    },

    drafts: () => (DB.get('quotes') || []).filter(q => q.status === 'Aberto')
        .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.id).localeCompare(String(a.id))),

    /** Título da tela + contador de rascunhos. */
    setTitle: (container) => {
        const t = container.querySelector('#quote-title');
        if (t) t.textContent = Quotes.editingQuoteId ? `Editando ${Quotes.editingQuoteId}` : 'Novo Orçamento';
        const n = container.querySelector('#drafts-count');
        if (n) n.textContent = Quotes.drafts().length;
    },

    /** Carrega um rascunho salvo na tela para continuar editando. */
    loadDraft: (container, id) => {
        const q = (DB.get('quotes') || []).find(x => x.id === id);
        if (!q) return;
        const set = (sel, v) => { const el = container.querySelector(sel); if (el) el.value = v ?? ''; };
        Quotes.currentItems = JSON.parse(JSON.stringify(q.items || []));
        const cust = container.querySelector('#input-customer');
        set('#input-customer', q.customerName);
        if (cust) { if (q.customerId) cust.dataset.customerId = q.customerId; else delete cust.dataset.customerId; }
        set('#input-whatsapp', q.phone);
        set('#input-notes', q.notes);
        set('#input-freight', q.freight || '');
        set('#input-urgency', q.urgency || '');
        set('#input-art', q.art || '');
        if (q.deadlineDays) set('#input-deadline', q.deadlineDays);
        Quotes.updateDeadlineDate(container);
        Quotes.discountMode = 'value';
        Quotes.discountInput = Number(q.discount) || 0;
        set('#input-discount-value', q.discount ? Number(q.discount).toFixed(2) : '');
        Quotes.editingQuoteId = q.id;
        Quotes.refreshItems(container);
        Quotes.setTitle(container);
        App.toast(`Orçamento ${q.id} aberto`, 'success');
    },

    /** Janela com os rascunhos salvos. */
    openDrafts: (container) => {
        document.getElementById('ggp-drafts-modal')?.remove();
        const list = Quotes.drafts();
        const el = document.createElement('div');
        el.id = 'ggp-drafts-modal';
        el.className = 'fixed inset-0 z-[120] flex items-center justify-center p-4';
        el.style.cssText = 'background:rgba(10,10,20,0.5); backdrop-filter:blur(8px);';
        el.innerHTML = `
            <div class="w-full max-w-3xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[85vh]">
                <div class="flex items-center justify-between px-6 py-4 border-b" style="border-color:var(--border);">
                    <div>
                        <h3 class="text-lg font-black" style="color:var(--text-main);">Orçamentos salvos</h3>
                        <p class="text-xs" style="color:var(--text-faint);">Orçamentos ainda não convertidos em pedido.</p>
                    </div>
                    <button type="button" data-close class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100" style="color:var(--text-faint);">
                        <span class="material-symbols-outlined" style="font-size:18px;">close</span>
                    </button>
                </div>
                <div class="overflow-y-auto p-4 space-y-2" style="background:var(--bg-main);">
                    ${list.length ? list.map(q => {
                        const [y, m, d] = String(q.date || '').split('-');
                        const n = (q.items || []).length;
                        return `
                        <div class="flex items-center gap-4 p-4 rounded-xl border bg-white" style="border-color:var(--border);" data-quote="${esc(q.id)}">
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2">
                                    <span class="text-xs font-black" style="color:var(--primary);">${esc(q.id)}</span>
                                    <span class="text-[11px]" style="color:var(--text-faint);">${d ? `${d}/${m}/${y}` : ''}</span>
                                </div>
                                <p class="text-sm font-bold truncate" style="color:var(--text-main);">${esc(q.customerName || 'Sem cliente')}</p>
                                <p class="text-xs truncate" style="color:var(--text-muted);">${n} ${n === 1 ? 'item' : 'itens'} · ${esc(q.productName || '')}</p>
                            </div>
                            <div class="text-right flex-shrink-0">
                                <p class="text-base font-black" style="color:var(--text-main);">${fmtBRL(q.value)}</p>
                            </div>
                            <div class="flex gap-1 flex-shrink-0">
                                <button type="button" data-act="open" class="btn-primary !py-2 !px-3 text-xs" title="Continuar editando">
                                    <span class="material-symbols-outlined !text-sm">edit</span> Abrir
                                </button>
                                <button type="button" data-act="pdf" class="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-violet-50 text-slate-500" title="PDF do orçamento">
                                    <span class="material-symbols-outlined" style="font-size:18px;">picture_as_pdf</span>
                                </button>
                                <button type="button" data-act="delete" class="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-400" title="Excluir orçamento">
                                    <span class="material-symbols-outlined" style="font-size:18px;">delete</span>
                                </button>
                            </div>
                        </div>`;
                    }).join('') : `
                        <div class="text-center py-10">
                            <span class="material-symbols-outlined text-4xl text-slate-300">draft</span>
                            <p class="text-sm font-bold mt-2" style="color:var(--text-muted);">Nenhum orçamento salvo</p>
                            <p class="text-xs mt-1" style="color:var(--text-faint);">Use "Salvar Orçamento" para guardar e continuar depois.</p>
                        </div>`}
                </div>
            </div>`;

        const close = () => { el.remove(); document.removeEventListener('keydown', onKey); };
        const onKey = (e) => { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', onKey);
        el.addEventListener('click', (e) => {
            if (e.target === el || e.target.closest('[data-close]')) return close();
            const btn = e.target.closest('[data-act]');
            if (!btn) return;
            const id = btn.closest('[data-quote]').dataset.quote;
            const q = (DB.get('quotes') || []).find(x => x.id === id);
            if (!q) return;
            if (btn.dataset.act === 'open') { close(); Quotes.loadDraft(container, id); }
            else if (btn.dataset.act === 'pdf') { QuotePDF.fromOrder(q, 'orcamento'); }
            else if (btn.dataset.act === 'delete') {
                App.confirm({
                    title: 'Excluir orçamento?',
                    message: `O orçamento ${id} (${q.customerName || 'sem cliente'}) será apagado.`,
                    type: 'danger',
                    confirmLabel: 'Excluir',
                    onConfirm: () => {
                        DB.save('quotes', (DB.get('quotes') || []).filter(x => x.id !== id));
                        if (Quotes.editingQuoteId === id) Quotes.editingQuoteId = null;
                        Quotes.setTitle(container);
                        App.toast('Orçamento excluído', 'info');
                        Quotes.openDrafts(container);
                    }
                });
            }
        });
        document.body.appendChild(el);
    },

    /** Produto do catálogo ligado ao item (null para avulso/serviço). */
    productOf: (item) => item.productId == null ? null
        : (DB.get('products') || []).find(p => String(p.id) === String(item.productId)) || null,

    /** Grupos de variação válidos do produto (com nome e pelo menos 1 opção). */
    variationsOf: (product) => (product?.variations || [])
        .filter(g => g && String(g.name || '').trim() && Array.isArray(g.options) && g.options.some(o => String(o.name || '').trim())),

    /**
     * Recalcula o item a partir das opções escolhidas:
     * unitário = preço base + soma dos "Preço +" das opções; também guarda o custo e o texto das opções.
     */
    applyVariations: (item) => {
        const p = Quotes.productOf(item);
        if (!p) return;
        const groups = Quotes.variationsOf(p);
        item.selected = item.selected || {};
        let addPrice = 0, addCost = 0;
        const parts = [];
        groups.forEach(g => {
            const opts = g.options.filter(o => String(o.name || '').trim());
            let opt = opts.find(o => o.name === item.selected[g.name]);
            if (!opt) { opt = opts[0]; item.selected[g.name] = opt.name; }   // padrão: 1ª opção
            addPrice += parseFloat(opt.price) || 0;
            addCost += parseFloat(opt.cost) || 0;
            parts.push(`${g.name}: ${opt.name}`);
        });
        item.optionsText = parts.join(' · ');
        item.unitCost = Math.round(((parseFloat(p.cost) || 0) + addCost) * 100) / 100;
        item.unitPrice = Math.round(((parseFloat(p.price) || 0) + addPrice) * 100) / 100;
        item.price = Math.round(item.unitPrice * (Number(item.quantity) || 1) * 100) / 100;
    },

    /** Preço unitário (item.price é o total da linha; itens antigos não têm unitPrice). */
    unitPrice: (item) => {
        const u = parseFloat(item.unitPrice);
        if (!isNaN(u)) return u;
        return (parseFloat(item.price) || 0) / (Number(item.quantity) || 1);
    },

    /** Atualiza qtd/unitário de um item e recalcula o total da linha, sem redesenhar (mantém o foco). */
    updateItem: (container, id, { quantity, unitPrice }) => {
        const item = Quotes.currentItems.find(i => i.id === id);
        if (!item) return;
        const unit = unitPrice != null ? Math.max(0, unitPrice) : Quotes.unitPrice(item);
        const qty = quantity != null ? Math.max(1, Math.round(quantity)) : (Number(item.quantity) || 1);
        item.unitPrice = Math.round(unit * 100) / 100;
        item.quantity = qty;
        item.price = Math.round(item.unitPrice * qty * 100) / 100;

        const card = container.querySelector(`.quote-item-card[data-id="${id}"]`);
        if (card) {
            card.querySelector('.item-total').textContent = fmtBRL(item.price);
            card.querySelector('.item-unit').textContent = qty > 1 ? `${fmtBRL(item.unitPrice)} / un` : '';
        }
        Quotes.updateSummary();
    },

    renderItems: () => {
        if (Quotes.currentItems.length === 0) return '';

        const icon = (name, size = 18) => `<span class="material-symbols-outlined" style="font-size:${size}px;">${name}</span>`;
        const has = (v) => v && v !== '-';

        return Quotes.currentItems.map(item => {
            const product = Quotes.productOf(item);
            const image = item.image || product?.image || '';
            const groups = Quotes.variationsOf(product);
            const typeIcon = item.category === 'Serviço' ? 'design_services' : product ? 'inventory_2' : 'edit_note';
            const extras = [['Material', item.material], ['Cores', item.colors], ['Acabamento', item.finish], ['Prazo', item.deadline !== 'Padrão' ? item.deadline : '']]
                .filter(([, v]) => has(v));

            return `
            <!-- Item Card -->
            <div class="quote-item-card bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-[0px_4px_20px_rgba(109,40,255,0.04)] hover:shadow-[0px_10px_30px_rgba(109,40,255,0.08)] transition-shadow" data-id="${item.id}">
                <div class="p-5 flex gap-5">
                    <!-- Miniatura -->
                    <div class="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 border border-outline-variant/30 bg-surface-container-low flex items-center justify-center">
                        ${image
                            ? `<img src="${esc(image)}" alt="" class="w-full h-full object-cover" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'material-symbols-outlined text-outline',textContent:'image_not_supported'}))">`
                            : `<span class="material-symbols-outlined text-outline" style="font-size:34px;">${typeIcon}</span>`}
                    </div>

                    <div class="flex-1 min-w-0">
                        <!-- Cabeçalho: nome, categoria, preço e ações -->
                        <div class="flex items-start justify-between gap-4">
                            <div class="min-w-0">
                                <h4 class="text-lg font-bold text-on-surface leading-snug">${esc(item.name)}</h4>
                                <div class="flex flex-wrap items-center gap-1.5 mt-1">
                                    <span class="px-2 py-0.5 bg-surface-variant text-tertiary rounded-md text-[11px] font-bold">${esc(item.category)}</span>
                                    ${item.optionsText ? `<span class="text-xs" style="color:var(--text-muted);">${esc(item.optionsText)}</span>` : ''}
                                </div>
                            </div>
                            <div class="text-right flex-shrink-0">
                                <div class="item-total text-2xl font-black text-primary leading-none">${fmtBRL(item.price)}</div>
                                <div class="item-unit text-xs mt-1" style="color:var(--text-faint);">${item.quantity > 1 ? `${fmtBRL(Quotes.unitPrice(item))} / un` : ''}</div>
                            </div>
                        </div>

                        <!-- Controles -->
                        <div class="flex flex-wrap items-end gap-4 mt-4">
                            <div>
                                <span class="block text-[11px] font-bold uppercase tracking-wide text-on-surface-variant mb-1">Quantidade</span>
                                <div class="flex items-center gap-1">
                                    <button type="button" class="btn-qty w-9 h-9 rounded-lg border border-outline-variant/50 bg-white hover:border-primary hover:text-primary flex items-center justify-center transition-colors" data-delta="-1" title="Diminuir">${icon('remove')}</button>
                                    <input type="number" class="input-qty font-semibold" min="1" step="1" value="${item.quantity}" inputmode="numeric"
                                           style="width:68px; padding:7px 4px; text-align:center; border-radius:10px;" aria-label="Quantidade">
                                    <button type="button" class="btn-qty w-9 h-9 rounded-lg border border-outline-variant/50 bg-white hover:border-primary hover:text-primary flex items-center justify-center transition-colors" data-delta="1" title="Aumentar">${icon('add')}</button>
                                </div>
                            </div>
                            <div>
                                <span class="block text-[11px] font-bold uppercase tracking-wide text-on-surface-variant mb-1">Valor unit. (R$)</span>
                                <input type="number" class="input-unit font-semibold" min="0" step="0.01" value="${Quotes.unitPrice(item).toFixed(2)}" inputmode="decimal"
                                       style="width:120px; padding:7px 10px; border-radius:10px;" aria-label="Valor unitário">
                            </div>
                            ${groups.map(g => `
                                <div style="min-width:170px;">
                                    <span class="block text-[11px] font-bold uppercase tracking-wide text-on-surface-variant mb-1">${esc(g.name)}</span>
                                    <select class="input-variation font-semibold" data-group="${esc(g.name)}" style="padding-top:7px; padding-bottom:7px; border-radius:10px;">
                                        ${g.options.filter(o => String(o.name || '').trim()).map(o => {
                                            const add = parseFloat(o.price) || 0;
                                            return `<option value="${esc(o.name)}" ${item.selected?.[g.name] === o.name ? 'selected' : ''}>${esc(o.name)}${add ? ` (+ ${fmtBRL(add)})` : ''}</option>`;
                                        }).join('')}
                                    </select>
                                </div>`).join('')}

                            <!-- Ações -->
                            <div class="ml-auto flex gap-1">
                                <button type="button" class="btn-duplicate-item w-9 h-9 flex items-center justify-center text-outline hover:text-primary rounded-lg hover:bg-surface-variant transition-colors" title="Duplicar">${icon('content_copy')}</button>
                                <button type="button" class="btn-delete-item w-9 h-9 flex items-center justify-center text-outline hover:text-error rounded-lg hover:bg-error-container transition-colors" title="Excluir">${icon('delete')}</button>
                            </div>
                        </div>

                        ${extras.length ? `
                        <div class="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs" style="color:var(--text-muted);">
                            ${extras.map(([k, v]) => `<span><b class="font-semibold">${k}:</b> ${esc(v)}</span>`).join('')}
                        </div>` : ''}
                    </div>
                </div>
            </div>`;
        }).join('');
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
            // Busca sem acento/maiúsculas; telefone e documento comparados só pelos dígitos
            const norm = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            const digits = (t) => String(t || '').replace(/\D/g, '');
            let activeIdx = -1;

            const renderDropdown = () => {
                const term = norm(inputCustomer.value.trim());
                const dTerm = digits(inputCustomer.value);
                const customers = (DB.get('customers') || []).slice()
                    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
                const matches = !term ? customers : customers.filter(c =>
                    norm(c.name).includes(term) ||
                    (dTerm.length >= 3 && (digits(c.phone).includes(dTerm) || digits(c.document).includes(dTerm)))
                );
                activeIdx = -1;
                dropdown.style.maxHeight = '320px';
                dropdown.style.overflowY = 'auto';
                dropdown.style.zIndex = '50';

                if (!customers.length) {
                    dropdown.innerHTML = `<div class="px-4 py-3 text-sm text-outline italic">Nenhum cliente cadastrado — use "Novo Cliente".</div>`;
                } else if (!matches.length) {
                    dropdown.innerHTML = `<div class="px-4 py-3 text-sm text-outline italic">Nenhum cliente encontrado para "${esc(inputCustomer.value.trim())}"</div>`;
                } else {
                    dropdown.innerHTML = `
                        <div class="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-outline border-b border-outline-variant/10">
                            ${term ? `${matches.length} encontrado(s)` : `${customers.length} cliente(s)`}
                        </div>` + matches.slice(0, 100).map(c => `
                        <div class="customer-option px-4 py-3 hover:bg-surface-variant cursor-pointer border-b border-outline-variant/10 last:border-0" data-id="${esc(c.id)}">
                            <div class="font-semibold text-on-surface text-body-md">${esc(c.name)}</div>
                            <div class="text-xs text-on-surface-variant">${esc(c.phone || 'Sem telefone')}${c.document ? ` • ${esc(c.document)}` : ''}</div>
                        </div>`).join('');
                }
                dropdown.classList.remove('hidden');
            };

            const highlight = (idx) => {
                const rows = [...dropdown.querySelectorAll('.customer-option')];
                if (!rows.length) return;
                activeIdx = (idx + rows.length) % rows.length;
                rows.forEach((r, k) => r.classList.toggle('bg-surface-variant', k === activeIdx));
                rows[activeIdx].scrollIntoView({ block: 'nearest' });
            };

            // Abre a lista ao clicar/focar e filtra enquanto digita
            inputCustomer.addEventListener('focus', renderDropdown);
            inputCustomer.addEventListener('click', renderDropdown);
            inputCustomer.addEventListener('input', () => {
                delete inputCustomer.dataset.customerId;   // digitou outro nome: desfaz o vínculo anterior
                renderDropdown();
            });
            inputCustomer.addEventListener('keydown', (e) => {
                if (dropdown.classList.contains('hidden') && e.key === 'ArrowDown') return renderDropdown();
                if (e.key === 'ArrowDown') { e.preventDefault(); highlight(activeIdx + 1); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(activeIdx - 1); }
                else if (e.key === 'Enter' && activeIdx >= 0) {
                    e.preventDefault();
                    dropdown.querySelectorAll('.customer-option')[activeIdx]?.click();
                } else if (e.key === 'Escape' || e.key === 'Tab') dropdown.classList.add('hidden');
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
        bindCepLookup(container.querySelector('#qc-cep'), container.querySelector('#qc-address'));

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
                phone: document.getElementById('qc-phone').value,
                cep: document.getElementById('qc-cep').value,
                address: document.getElementById('qc-address').value.trim()
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
                            <img src="${esc(p.image || 'https://via.placeholder.com/100?text=📦')}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/100?text=📦'">
                        </div>
                        <div>
                            <h4 class="font-bold text-on-surface text-sm leading-tight">${esc(p.name)}</h4>
                            <span class="text-[10px] bg-surface-variant text-on-surface-variant px-1.5 py-0.5 rounded mt-1 inline-block">${esc(p.category || 'Geral')}</span>
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
                    productId: p.id,   // liga o item ao produto (arquivos de corte, etc.)
                    unitPrice: parseFloat(p.price) || 0,
                    name: p.name,
                    category: p.category || 'Catálogo',
                    price: parseFloat(p.price) || 0,
                    quantity: 1,
                    material: '-',
                    colors: '-',
                    finish: '-',
                    deadline: 'Padrão'
                });
                Quotes.applyVariations(Quotes.currentItems[Quotes.currentItems.length - 1]);
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
                unitPrice: price,
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
        ['input-freight', 'input-urgency', 'input-art'].forEach(id => {
            container.querySelector(`#${id}`)?.addEventListener('input', Quotes.updateSummary);
        });

        // Desconto: o campo digitado vira a referência; os outros dois são recalculados
        ['input-discount', 'input-discount-value', 'input-final-total'].forEach(id => {
            const el = container.querySelector(`#${id}`);
            el?.addEventListener('input', () => {
                Quotes.discountMode = el.dataset.mode;
                Quotes.discountInput = parseFloat(String(el.value).replace(',', '.')) || 0;
                Quotes.updateSummary();
            });
            el?.addEventListener('change', () => Quotes.syncDiscountFields(true));   // ao sair: normaliza o próprio campo
        });

        // Generate Order / Save Quote Logic
        const generateOrder = (status, extra) => {
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
            
            const { total, subtotal, discount, discountPct, freight, urgency, art } = Quotes.computeTotals();

            const orders = DB.get('orders') || [];
            const quotes = DB.get('quotes') || [];
            
            const isDraft = status === 'Aberto';
            const newOrder = {
                id: isDraft && Quotes.editingQuoteId ? Quotes.editingQuoteId
                    : `${isDraft ? 'ORC' : 'ORD'}-${Date.now().toString(36).toUpperCase()}`,
                date: new Date().toISOString().split('T')[0],
                customerId: customerInput.dataset.customerId || null,
                customerName: customerName,
                productName: Quotes.currentItems.map(i => i.name).join(', '),
                options: Quotes.currentItems.map(i => i.optionsText).filter(Boolean),
                value: total,
                subtotal,
                discount,                                        // R$ de desconto
                discountPct: Math.round(discountPct * 100) / 100,
                freight, urgency, art,
                phone: container.querySelector('#input-whatsapp')?.value.trim() || '',
                deadlineDays: Quotes.deadlineDays(),
                ...(extra || {}),
                status: status, // 'Aberto' for Quote, 'Aguardando Arte' for Order
                items: Quotes.currentItems,
                notes: document.getElementById('input-notes')?.value || ''
            };
            
            if (isDraft) {
                const idx = quotes.findIndex(q => q.id === newOrder.id);
                if (idx !== -1) quotes[idx] = { ...quotes[idx], ...newOrder };
                else quotes.push(newOrder);
                DB.save('quotes', quotes);
                Quotes.editingQuoteId = newOrder.id;
                Quotes.setTitle(container);
                App.toast(idx !== -1 ? 'Orçamento atualizado' : 'Orçamento salvo! Fica em "Orçamentos salvos" no topo desta tela.', 'success');
            } else {
                // Veio de um rascunho? Marca como convertido (sai da lista e da contagem de abertos)
                if (Quotes.editingQuoteId) {
                    const q = quotes.find(x => x.id === Quotes.editingQuoteId);
                    if (q) { q.status = 'Convertido'; q.orderId = newOrder.id; DB.save('quotes', quotes); }
                }
                orders.unshift(newOrder);
                DB.save('orders', orders);
                App.toast('Pedido gerado! Movido para Produção.', 'success');
                App.navigateTo('producao');
            }
        };

        container.querySelector('#btn-drafts')?.addEventListener('click', () => Quotes.openDrafts(container));
        Quotes.setTitle(container);

        container.querySelector('#btn-generate')?.addEventListener('click', () => {
            if (!container.querySelector('#input-customer')?.value.trim()) return App.toast('Informe o cliente primeiro', 'error');
            if (!Quotes.currentItems.length) return App.toast('Adicione pelo menos um item', 'error');
            // Pergunta o prazo antes de mandar para a produção
            Quotes.askDeadline(container, (days, payment) => {
                const entry = Payments.entry(payment);
                generateOrder('Aguardando Arte', {
                    deadlineDays: days,
                    dueDate: isoDate(addBusinessDays(new Date(), days)),
                    payments: entry ? [entry] : []
                });
            });
        });

        const deadlineInput = container.querySelector('#input-deadline');
        if (deadlineInput) {
            const shop = DB.get('shop_profile') || {};
            deadlineInput.value = parseInt(shop.defaultDeadline) || 5;
            deadlineInput.addEventListener('input', () => Quotes.updateDeadlineDate(container));
            Quotes.updateDeadlineDate(container);
        }
        
        container.querySelector('#btn-save')?.addEventListener('click', () => {
            generateOrder('Aberto');
        });

        container.querySelector('#btn-whatsapp')?.addEventListener('click', () => {
            const customerName = container.querySelector('#input-customer')?.value.trim();
            if (!customerName) {
                App.toast('Informe o cliente primeiro', 'error');
                return;
            }
            if (Quotes.currentItems.length === 0) {
                App.toast('Adicione pelo menos um item', 'error');
                return;
            }

            const { subtotal, freight, urgency, art, discount, total } = Quotes.computeTotals();
            const notes = document.getElementById('input-notes')?.value.trim();

            const lines = [
                '*ORÇAMENTO*',
                '',
                `*Cliente:* ${customerName}`,
                '',
                '*Itens:*',
                ...Quotes.currentItems.map(i => `• ${i.quantity}x ${i.name}${i.optionsText ? ` (${i.optionsText})` : ''} — ${fmtBRL(i.price)}`),
                '',
                `*Subtotal:* ${fmtBRL(subtotal)}`
            ];
            if (freight > 0) lines.push(`*Frete:* + ${fmtBRL(freight)}`);
            if (urgency > 0) lines.push(`*Taxa de Urgência:* + ${fmtBRL(urgency)}`);
            if (art > 0) lines.push(`*Instalação / Arte:* + ${fmtBRL(art)}`);
            if (discount > 0) lines.push(`*Desconto (${Quotes.fmtPct(Quotes.computeTotals().discountPct)}):* - ${fmtBRL(discount)}`);
            lines.push(`*TOTAL:* ${fmtBRL(total)}`);
            lines.push('', `_Prazo de produção: ${Quotes.deadlineText()}_`);
            if (notes) lines.push('', `Obs: ${notes}`);

            // Mostra a mensagem pronta para copiar e colar na conversa (não envia nada)
            Quotes.showMessage(lines.join('\n'));
        });
        
        container.querySelector('#btn-pdf')?.addEventListener('click', () => {
            const customerName = container.querySelector('#input-customer')?.value.trim();
            if (!customerName) return App.toast('Informe o cliente primeiro', 'error');
            if (Quotes.currentItems.length === 0) return App.toast('Adicione pelo menos um item', 'error');

            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            QuotePDF.open({
                // Nº legível e único o bastante p/ uma gráfica: ORC-AAMMDD-HHMM
                number: `ORC-${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`,
                date: now,
                customer: customerName,
                phone: container.querySelector('#input-whatsapp')?.value.trim(),
                address: (DB.get('customers') || []).find(c => String(c.id) === String(container.querySelector('#input-customer')?.dataset.customerId))?.address || '',
                items: Quotes.currentItems,
                totals: Quotes.computeTotals(),
                notes: document.getElementById('input-notes')?.value.trim(),
                deadline: Quotes.deadlineText()
            });
            App.toast('Na janela que abrir, escolha "Salvar como PDF"', 'info');
        });

        // Troca de variação (ex.: Tamanho) → recalcula o preço do item
        container.querySelector('#quotes-items-container')?.addEventListener('change', (e) => {
            const sel = e.target.closest('.input-variation');
            if (!sel) return;
            const id = parseInt(sel.closest('.quote-item-card').dataset.id);
            const item = Quotes.currentItems.find(i => i.id === id);
            if (!item) return;
            item.selected = { ...(item.selected || {}), [sel.dataset.group]: sel.value };
            Quotes.applyVariations(item);
            Quotes.refreshItems(container);
        });

        // Quantidade / valor unitário digitados (input = ao vivo; change = corrige valor inválido)
        const itemsBox = container.querySelector('#quotes-items-container');
        ['input', 'change'].forEach(evt => itemsBox?.addEventListener(evt, (e) => {
            const field = e.target.closest('.input-qty, .input-unit');
            if (!field) return;
            const card = field.closest('.quote-item-card');
            const id = parseInt(card.dataset.id);
            const val = parseFloat(String(field.value).replace(',', '.'));
            const isQty = field.classList.contains('input-qty');
            if (isNaN(val)) { if (evt === 'change') Quotes.refreshItems(container); return; }
            Quotes.updateItem(container, id, isQty ? { quantity: val } : { unitPrice: val });
            if (evt === 'change') {
                const item = Quotes.currentItems.find(i => i.id === id);
                field.value = isQty ? item.quantity : item.unitPrice.toFixed(2);
            }
        }));

        // Item cards actions (listener único delegado — sobrevive aos re-renders do container)
        container.querySelector('#quotes-items-container')?.addEventListener('click', (e) => {
            const card = e.target.closest('.quote-item-card');
            if (!card) return;
            const id = parseInt(card.dataset.id);

            const qtyBtn = e.target.closest('.btn-qty');
            if (qtyBtn) {
                const item = Quotes.currentItems.find(i => i.id === id);
                if (!item) return;
                const qty = Math.max(1, (Number(item.quantity) || 1) + Number(qtyBtn.dataset.delta));
                card.querySelector('.input-qty').value = qty;
                Quotes.updateItem(container, id, { quantity: qty });
                return;
            }

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
                // Quantidade e valor já são editáveis no card: leva o foco para a quantidade
                const qty = card.querySelector('.input-qty');
                qty?.focus();
                qty?.select();
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
        const base = subtotal + extras;
        const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
        const v = Number(Quotes.discountInput) || 0;
        let discount = 0;
        if (Quotes.discountMode === 'pct') discount = subtotal * clamp(v, 0, 100) / 100;
        else if (Quotes.discountMode === 'value') discount = clamp(v, 0, subtotal);
        else if (Quotes.discountMode === 'total' && v > 0) discount = clamp(base - v, 0, subtotal);  // "fechar por"
        discount = Math.round(discount * 100) / 100;
        const discountPct = subtotal > 0 ? (discount / subtotal) * 100 : 0;
        return { subtotal, freight, urgency, art, extras, discount, discountPct, total: Math.round((base - discount) * 100) / 100 };
    },

    fmtPct: (p) => `${(Math.round(p * 100) / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`,

    /** Preenche os campos de desconto que não são a referência (ou todos, com includeActive). */
    syncDiscountFields: (includeActive = false) => {
        const { subtotal, discount, discountPct, total } = Quotes.computeTotals();
        const has = discount > 0;
        const fields = {
            pct:   [document.getElementById('input-discount'),       has ? String(Math.round(discountPct * 100) / 100) : ''],
            value: [document.getElementById('input-discount-value'), has ? discount.toFixed(2) : ''],
            total: [document.getElementById('input-final-total'),    has ? total.toFixed(2) : '']
        };
        Object.entries(fields).forEach(([mode, [el, val]]) => {
            if (!el) return;
            if (mode === Quotes.discountMode && !includeActive) return;   // não mexe no que está sendo digitado
            if (mode === Quotes.discountMode && includeActive && !has && Number(Quotes.discountInput) > 0) return;
            el.value = val;
        });

        const hint = document.getElementById('discount-hint');
        if (hint) {
            hint.classList.toggle('hidden', !has);
            if (has) {
                const items = Quotes.currentItems;
                const unit = items.length === 1 && Number(items[0].quantity) > 1
                    ? ` · sai a <b>${fmtBRL((items[0].price - discount) / items[0].quantity)}</b> por unidade` : '';
                hint.innerHTML = `Desconto de <b>${fmtBRL(discount)}</b> (${Quotes.fmtPct(discountPct)}) — de ${fmtBRL(subtotal)} por <b>${fmtBRL(subtotal - discount)}</b> em produtos${unit}`;
            }
        }
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
                        <span class="text-body-sm font-body-sm text-on-surface max-w-[70%] truncate">${item.quantity}x ${esc(item.name)}${item.optionsText ? ` <span class="text-outline">(${esc(item.optionsText)})</span>` : ''}</span>
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
        const discountLabel = document.getElementById('summary-discount-label');
        if (discountLabel) discountLabel.innerText = discount > 0 ? `Desconto (${Quotes.fmtPct(Quotes.computeTotals().discountPct)})` : 'Desconto';
        Quotes.syncDiscountFields();
        if(summaryTotal) summaryTotal.innerText = fmtBRL(total);
    }
};

export default Quotes;
