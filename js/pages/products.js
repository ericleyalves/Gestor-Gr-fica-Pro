import DB from '../db.js';
import { esc } from '../utils.js';
import Files from '../files.js';
import LaserCalc from '../laser-calc.js';
import Catalog from '../catalog.js';
import PriceTiers from '../price-tiers.js';

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
                    <div class="flex gap-2">
                    <button id="btn-catalog" class="btn-ghost" title="Vitrine pública para mandar no WhatsApp"><span class="material-symbols-outlined" style="font-size:18px;">storefront</span> Catálogo online</button>
                    <button id="btn-laser-tool" class="btn-ghost"><span class="material-symbols-outlined" style="font-size:18px;">calculate</span> Calculadora laser</button>
                    <button id="btn-add-product" class="btn-primary">
                        <span class="material-symbols-outlined" style="font-size:18px;">add</span>
                        Novo Produto
                    </button>
                    </div>
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
                                   <tbody id="products-tbody">
                                       ${products.map(p => Products.renderRow(p)).join('')}
                                   </tbody>
                               </table>
                           </div>`
                    }
                </div>
            </div>

            <!-- PRODUCT MODAL -->
            <div id="product-modal" class="hidden fixed inset-0 z-[100] flex items-center justify-center p-4" style="background:rgba(10,10,20,0.5); backdrop-filter:blur(8px);">
                <div class="quote-modal-inner" style="max-width:880px;">
                    <!-- Formulário (ocupa a janela toda) -->
                    <div class="flex flex-col min-w-0" style="flex:1 1 auto;">
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

                        <div class="flex-1 overflow-y-auto px-8 py-6" style="background:var(--bg-main);">
                            <form id="form-product" class="space-y-5">
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
                                            <div id="cat-select-wrap" class="flex gap-2">
                                                <select id="p-category" class="flex-1 min-w-0"></select>
                                                <button type="button" id="btn-new-category" class="btn-ghost !px-3 flex-shrink-0" title="Criar nova categoria">
                                                    <span class="material-symbols-outlined" style="font-size:18px;">add</span>
                                                </button>
                                            </div>
                                            <div id="cat-new-wrap" class="hidden gap-2">
                                                <input type="text" id="p-new-category" placeholder="Nome da nova categoria" autocomplete="off" maxlength="40" class="flex-1 min-w-0">
                                                <button type="button" id="btn-save-category" class="btn-primary !px-3 flex-shrink-0" title="Adicionar">
                                                    <span class="material-symbols-outlined" style="font-size:18px;">check</span>
                                                </button>
                                                <button type="button" id="btn-cancel-category" class="btn-ghost !px-3 flex-shrink-0" title="Cancelar">
                                                    <span class="material-symbols-outlined" style="font-size:18px;">close</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div class="col-span-2">
                                            <div class="flex items-center justify-between mb-1.5">
                                                <label class="!mb-0">Fotos do Produto <span class="font-normal" style="color:var(--text-faint);">(a 1ª é a capa)</span></label>
                                                <button type="button" id="btn-image-link" class="text-xs font-semibold" style="color:var(--primary);">+ Adicionar por link</button>
                                            </div>
                                            <div id="p-gallery" class="flex flex-wrap gap-3"></div>
                                            <input type="file" id="p-image-file" accept="image/jpeg,image/png,image/webp,image/gif" multiple class="hidden">
                                            <div id="p-image-link-row" class="hidden mt-2 flex gap-2">
                                                <input type="text" id="p-image" placeholder="Cole o link: https://exemplo.com/imagem.jpg" autocomplete="off" class="!py-2 text-xs flex-1">
                                                <button type="button" id="btn-add-image-link" class="btn-ghost !py-1.5 !px-3 text-xs">Adicionar</button>
                                            </div>
                                            <p class="text-[10px] mt-2" style="color:var(--text-faint);">JPG, PNG ou WEBP — pode escolher várias de uma vez ou arrastar. As fotos são reduzidas automaticamente.</p>
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

                                <!-- 3. Precificação Base -->
                                <div class="section-card">
                                    <div class="section-header">
                                        <div class="section-icon"><span class="material-symbols-outlined">payments</span></div>
                                        <h4 class="section-title flex-1">Precificação Base</h4>
                                        <button type="button" id="btn-laser-calc" class="btn-ghost !py-1 !px-2 text-xs">
                                            <span class="material-symbols-outlined !text-sm">calculate</span> Calcular preço (laser)
                                        </button>
                                    </div>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label>Valor da Compra (Custo R$)</label>
                                            <input type="number" id="p-cost" placeholder="0.00" step="0.01" class="w-full">
                                        </div>
                                        <div>
                                            <label>Valor da Venda (Preço Final R$)</label>
                                            <input type="number" id="p-price" placeholder="0.00" step="0.01" class="w-full">
                                        </div>
                                    </div>
                                    <!-- Preço por quantidade (lojista) -->
                                    <div class="mt-5 pt-4 border-t border-dashed" style="border-color:var(--border);">
                                        <div class="flex items-center justify-between gap-2 mb-2">
                                            <div>
                                                <p class="text-sm font-bold" style="color:var(--text-main);">Preço por quantidade <span class="font-normal text-xs" style="color:var(--text-faint);">(lojista / atacado)</span></p>
                                                <p class="text-[11px]" style="color:var(--text-faint);">No orçamento, o preço unitário muda sozinho pela quantidade. Variações somam por cima.</p>
                                            </div>
                                            <button type="button" id="btn-add-tier" class="btn-ghost !py-1 !px-2 text-xs flex-shrink-0"><span class="material-symbols-outlined !text-sm">add</span> Faixa</button>
                                        </div>
                                        <div id="tiers-container" class="space-y-2"></div>
                                    </div>
                                </div>
                                
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
                            <!-- Materiais usados (baixa automática no estoque) -->
                                <div class="section-card">
                                    <div class="section-header">
                                        <div class="section-icon"><span class="material-symbols-outlined">inventory</span></div>
                                        <div class="flex-1">
                                            <h4 class="section-title">Materiais usados <span class="font-normal text-xs" style="color:var(--text-faint);">(por unidade)</span></h4>
                                            <p class="text-xs" style="color:var(--text-faint);">Descontados do Estoque quando o pedido entra em produção. Ex.: 1 chaveiro = 0,02 chapa.</p>
                                        </div>
                                        <button type="button" id="btn-add-material" class="btn-ghost !py-1 !px-2 text-xs">
                                            <span class="material-symbols-outlined !text-sm">add</span> Material
                                        </button>
                                    </div>
                                    <div id="p-materials" class="space-y-2 mt-4"></div>
                                </div>

                                <!-- 5. Arquivos de Corte / Gabaritos -->
                                <div class="section-card">
                                    <div class="section-header">
                                        <div class="section-icon"><span class="material-symbols-outlined">folder_zip</span></div>
                                        <div class="flex-1">
                                            <h4 class="section-title">Arquivos de Corte / Gabaritos</h4>
                                            <p class="text-xs" style="color:var(--text-faint);">CDR, DXF, SVG, PDF, AI, LBRN, ZIP… até 50 MB cada. Ficam disponíveis nos pedidos.</p>
                                        </div>
                                        <button type="button" id="btn-add-file" class="btn-ghost !py-1 !px-2 text-xs">
                                            <span class="material-symbols-outlined !text-sm">upload</span>
                                            Enviar Arquivo
                                        </button>
                                        <input type="file" id="p-files-input" multiple class="hidden">
                                    </div>
                                    <div id="p-files-drop" class="mt-4 rounded-xl border-2 border-dashed p-3 transition-all" style="border-color:var(--border);">
                                        <div id="p-files-list" class="space-y-2"></div>
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
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 border" style="border-color:var(--border);">
                            <img src="${esc(p.image || 'https://via.placeholder.com/100?text=📦')}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/100?text=📦'">
                        </div>
                        <div>
                            <p class="text-sm font-bold" style="color:var(--text-main);">${esc(p.name)}</p>
                            <div class="flex items-center gap-2">
                                <p class="text-xs font-semibold" style="color:var(--text-faint); text-transform:uppercase">${p.type === 'm2' ? 'Por Metro Quadrado' : 'Unidade'}</p>
                                ${p.manageStock === false ? '<span class="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold">SEM ESTOQUE</span>' : ''}
                                ${p.files?.length ? `<span class="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style="background:var(--primary-light); color:var(--primary);" title="Arquivos de corte anexados">📎 ${p.files.length}</span>` : ''}
                            </div>
                        </div>
                    </div>
                </td>
                <td class="px-5 py-3.5">
                    <p class="text-xs font-black" style="color:var(--primary);">${esc(p.ref || 'S/ REF')}</p>
                    <p class="text-xs" style="color:var(--text-faint);">${esc(p.category)}</p>
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
                        ${p.files?.length ? `
                        <button class="w-8 h-8 flex items-center justify-center rounded-[10px] transition-all" style="color:var(--primary);" onmouseover="this.style.background='var(--primary-light)'" onmouseout="this.style.background='transparent'" onclick="window.productFiles('${p.id}')" title="Baixar arquivos de corte">
                            <span class="material-symbols-outlined" style="font-size:18px;">download</span>
                        </button>` : ''}
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
        const searchInput = document.getElementById('product-search');
        
        let editingId = null;
        let currentVariations = [];

        // ---- Arquivos de corte ----
        let draftId = null;       // id do produto (novo produto já ganha id para nomear a pasta)
        let currentFiles = [];    // arquivos que ficarão no produto ao salvar
        let uploadedNow = [];     // enviados nesta edição → apagados se cancelar
        let removedNow = [];      // removidos nesta edição → apagados do Storage só ao salvar
        let uploading = 0;

        const generateId = () => {
            try { return crypto.randomUUID(); }
            catch (e) { return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15); }
        };
        const toast = (msg, type) => import('../app.js').then(m => m.default.toast(msg, type));

        const filesList = document.getElementById('p-files-list');
        const filesInput = document.getElementById('p-files-input');
        const filesDrop = document.getElementById('p-files-drop');

        const renderFiles = () => {
            filesList.innerHTML = currentFiles.length
                ? currentFiles.map(f => Files.row(f, 'edit')).join('')
                : `<p class="text-[11px] text-center py-2 italic" style="color:var(--text-faint);">Nenhum arquivo. Clique em "Enviar Arquivo" ou arraste para cá.</p>`;
        };

        const uploadFiles = async (fileList) => {
            const files = [...(fileList || [])];
            if (!files.length) return;
            await Promise.all(files.map(async (file) => {
                const temp = { path: `uploading-${generateId()}`, name: file.name, size: file.size, uploading: true };
                currentFiles.push(temp);
                uploading++;
                renderFiles();
                try {
                    const meta = await DB.uploadFile(`products/${draftId}`, file);
                    const i = currentFiles.indexOf(temp);
                    if (i !== -1) currentFiles[i] = meta;
                    uploadedNow.push(meta.path);
                } catch (e) {
                    console.error(e);
                    currentFiles = currentFiles.filter(f => f !== temp);
                    toast(`Falha ao enviar "${file.name}": ${e.message || 'erro na nuvem'}`, 'error');
                } finally {
                    uploading--;
                    renderFiles();
                }
            }));
        };

        document.getElementById('btn-add-file').onclick = () => filesInput.click();
        filesInput.onchange = () => { uploadFiles(filesInput.files); filesInput.value = ''; };

        filesDrop.addEventListener('dragover', (e) => { e.preventDefault(); filesDrop.style.borderColor = 'var(--primary)'; });
        filesDrop.addEventListener('dragleave', () => { filesDrop.style.borderColor = 'var(--border)'; });
        filesDrop.addEventListener('drop', (e) => {
            e.preventDefault();
            filesDrop.style.borderColor = 'var(--border)';
            uploadFiles(e.dataTransfer.files);
        });

        Files.bindDownloads(filesList);
        filesList.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-file-remove]');
            if (!btn) return;
            const path = btn.dataset.fileRemove;
            currentFiles = currentFiles.filter(f => f.path !== path);
            removedNow.push(path);
            renderFiles();
        });

        /** Apaga do Storage caminhos que nenhum produto usa mais (duplicados compartilham arquivos). */
        const purgeUnused = (paths, products) => {
            const inUse = new Set(products.flatMap(p => (p.files || []).map(f => f.path)));
            DB.removeFiles(paths.filter(path => !inUse.has(path)));
        };

        // ---- Categorias (lista salva na nuvem em app_settings.product_categories) ----
        const DEFAULT_CATEGORIES = ['Cartões', 'Banners', 'Adesivos', 'Folhetos', 'Diversos'];
        const catSelect = document.getElementById('p-category');
        const catSelectWrap = document.getElementById('cat-select-wrap');
        const catNewWrap = document.getElementById('cat-new-wrap');
        const catNewInput = document.getElementById('p-new-category');

        /** Categorias salvas + as já usadas em produtos (nada some se a lista mudar). */
        const getCategories = () => {
            const saved = DB.get('product_categories');
            const used = (DB.get('products') || []).map(p => p.category);
            const all = [...(Array.isArray(saved) ? saved : DEFAULT_CATEGORIES), ...used]
                .map(c => String(c || '').trim()).filter(Boolean);
            const seen = new Set();
            return all.filter(c => { const k = c.toLowerCase(); return !seen.has(k) && seen.add(k); })
                      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
        };

        const renderCategories = (selected) => {
            const cats = getCategories();
            if (selected && !cats.includes(selected)) cats.push(selected);
            catSelect.innerHTML = cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
            if (selected) catSelect.value = selected;
        };

        const toggleNewCategory = (show) => {
            catSelectWrap.classList.toggle('hidden', show);
            catSelectWrap.classList.toggle('flex', !show);
            catNewWrap.classList.toggle('hidden', !show);
            catNewWrap.classList.toggle('flex', show);
            catNewInput.value = '';
            if (show) catNewInput.focus();
        };

        const saveNewCategory = () => {
            const name = catNewInput.value.trim().replace(/\s+/g, ' ');
            if (!name) return catNewInput.focus();
            const existing = getCategories().find(c => c.toLowerCase() === name.toLowerCase());
            if (!existing) {
                const saved = Array.isArray(DB.get('product_categories')) ? DB.get('product_categories') : [...DEFAULT_CATEGORIES];
                DB.save('product_categories', [...saved, name]);
                toast(`Categoria "${name}" criada`);
            }
            toggleNewCategory(false);
            renderCategories(existing || name);
        };

        document.getElementById('btn-new-category').onclick = () => toggleNewCategory(true);
        document.getElementById('btn-cancel-category').onclick = () => toggleNewCategory(false);
        document.getElementById('btn-save-category').onclick = saveNewCategory;
        catNewInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); saveNewCategory(); }   // não envia o formulário
            if (e.key === 'Escape') { e.preventDefault(); toggleNewCategory(false); }
        });

        // ---- Calculadora de preço (laser) ----
        let currentCalc = null;   // parâmetros usados (product.calc), para reabrir com os mesmos valores
        let currentTiers = [];    // faixas de preço por quantidade (product.priceTiers)
        const tiersBox = document.getElementById('tiers-container');
        const renderTiers = () => { if (tiersBox) tiersBox.innerHTML = PriceTiers.editorHtml(currentTiers); };
        const readTiers = () => {
            if (!tiersBox) return;
            currentTiers = [...tiersBox.querySelectorAll('[data-tier]')].map(r => ({
                minQty: parseInt(r.querySelector('.tier-qty').value) || 0,
                price: parseFloat(r.querySelector('.tier-price').value) || 0
            }));
        };
        tiersBox?.addEventListener('input', readTiers);
        tiersBox?.addEventListener('click', (e) => {
            const del = e.target.closest('.tier-del');
            if (!del) return;
            readTiers();
            currentTiers.splice(Number(del.closest('[data-tier]').dataset.tier), 1);
            renderTiers();
        });
        document.getElementById('btn-add-tier')?.addEventListener('click', () => {
            readTiers();
            const last = currentTiers[currentTiers.length - 1];
            currentTiers.push({ minQty: last ? (last.minQty || 0) * 2 || 100 : 50, price: '' });
            renderTiers();
            tiersBox.querySelector('[data-tier]:last-child .tier-price')?.focus();
        });
        const fmtMoney = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        document.getElementById('btn-laser-tool').onclick = () => LaserCalc.open();
        document.getElementById('btn-catalog').onclick = () => Catalog.open();
        document.getElementById('btn-laser-calc').onclick = () => LaserCalc.open({
            initial: currentCalc,
            onApply: ({ unitCost, price, calc, materialUse }) => {
                document.getElementById('p-cost').value = unitCost.toFixed(2);
                document.getElementById('p-price').value = price.toFixed(2);
                currentCalc = calc;
                // Liga o consumo da chapa ao Estoque (fração de chapa por peça)
                if (calc.materialId && materialUse > 0) {
                    const i = currentMaterials.findIndex(u => u.materialId === calc.materialId);
                    if (i === -1) currentMaterials.push({ materialId: calc.materialId, qty: materialUse });
                    else currentMaterials[i].qty = materialUse;
                    renderMaterials();
                }
                updateCalc();
                toast(`Custo ${fmtMoney(unitCost)} · preço ${fmtMoney(price)} aplicados`);
            }
        });

        // ---- Materiais usados (product.materials = [{ materialId, qty }]) ----
        let currentMaterials = [];
        const matBox = document.getElementById('p-materials');
        const renderMaterials = () => {
            const mats = (DB.get('materials') || []).slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR'));
            if (!mats.length) {
                matBox.innerHTML = `<p class="text-[11px] italic text-center py-2" style="color:var(--text-faint);">Cadastre seus materiais na tela <b>Estoque</b> para poder vinculá-los aqui.</p>`;
                return;
            }
            matBox.innerHTML = currentMaterials.length ? currentMaterials.map((u, i) => {
                const m = mats.find(x => x.id === u.materialId);
                return `
                <div class="grid gap-3 items-center" style="grid-template-columns: minmax(0,1fr) 130px 40px;">
                    <select data-mat-sel="${i}">${mats.map(x => `<option value="${esc(x.id)}" ${x.id === u.materialId ? 'selected' : ''}>${esc(x.name)} (${esc(x.unit)})</option>`).join('')}</select>
                    <div class="relative"><input type="number" data-mat-qty="${i}" value="${Number(u.qty) || ''}" step="any" min="0" placeholder="0" class="pr-12 text-right" inputmode="decimal">
                        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style="color:var(--text-faint);">${esc(m?.unit || '')}</span></div>
                    <button type="button" data-mat-rm="${i}" class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-red-50 hover:text-red-500 text-slate-400" title="Remover"><span class="material-symbols-outlined" style="font-size:18px;">close</span></button>
                </div>`;
            }).join('') : `<p class="text-[11px] italic text-center py-2" style="color:var(--text-faint);">Nenhum material vinculado.</p>`;
        };
        document.getElementById('btn-add-material').onclick = () => {
            const mats = DB.get('materials') || [];
            if (!mats.length) return toast('Cadastre os materiais primeiro em Estoque.', 'error');
            currentMaterials.push({ materialId: mats[0].id, qty: 0 });
            renderMaterials();
        };
        matBox.addEventListener('change', (e) => {
            const s = e.target.closest('[data-mat-sel]');
            if (s) { currentMaterials[+s.dataset.matSel].materialId = s.value; renderMaterials(); }
        });
        matBox.addEventListener('input', (e) => {
            const q = e.target.closest('[data-mat-qty]');
            if (q) currentMaterials[+q.dataset.matQty].qty = Number(q.value) || 0;
        });
        matBox.addEventListener('click', (e) => {
            const r = e.target.closest('[data-mat-rm]');
            if (r) { currentMaterials.splice(+r.dataset.matRm, 1); renderMaterials(); }
        });

        // ---- Galeria de fotos (product.images; product.image = capa = 1ª foto) ----
        const imgInput = document.getElementById('p-image');
        const imgFile = document.getElementById('p-image-file');
        const gallery = document.getElementById('p-gallery');
        const linkRow = document.getElementById('p-image-link-row');
        let currentImages = [];    // fotos que ficarão no produto
        let originalImages = [];   // fotos ao abrir (apagadas do Storage só se removidas e salvar)
        let uploadedImages = [];   // enviadas nesta edição (descartadas se cancelar)
        let pendingUploads = 0;

        const imagesOf = (p) => Array.isArray(p?.images) && p.images.length ? p.images : (p?.image ? [p.image] : []);

        const renderGallery = () => {
            const tile = 'w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 border relative group';
            gallery.innerHTML = currentImages.map((url, i) => `
                <div class="${tile}" style="border-color:${i === 0 ? 'var(--primary)' : 'var(--border)'}; ${i === 0 ? 'box-shadow:0 0 0 2px var(--primary-light);' : ''}">
                    <img src="${esc(url)}" class="w-full h-full object-cover" alt="" onerror="this.style.opacity=.2">
                    ${i === 0 ? `<span class="absolute top-1 left-1 text-[9px] font-black px-1.5 py-0.5 rounded-md text-white" style="background:var(--primary);">CAPA</span>` : ''}
                    <div class="absolute inset-x-0 bottom-0 flex justify-center gap-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity" style="background:linear-gradient(transparent, rgba(0,0,0,.55));">
                        ${i > 0 ? `<button type="button" data-img-cover="${i}" class="w-7 h-7 rounded-lg bg-white/90 hover:bg-white flex items-center justify-center" title="Usar como capa">
                            <span class="material-symbols-outlined" style="font-size:16px;color:var(--primary);">star</span></button>` : ''}
                        <button type="button" data-img-remove="${i}" class="w-7 h-7 rounded-lg bg-white/90 hover:bg-white flex items-center justify-center" title="Remover foto">
                            <span class="material-symbols-outlined" style="font-size:16px;color:#ef4444;">delete</span></button>
                    </div>
                </div>`).join('')
                + Array.from({ length: pendingUploads }, () => `
                <div class="${tile} flex items-center justify-center bg-white" style="border-color:var(--border);">
                    <span class="material-symbols-outlined animate-spin" style="color:var(--primary);">progress_activity</span>
                </div>`).join('')
                + `<button type="button" id="btn-add-photo" class="${tile} border-2 border-dashed flex flex-col items-center justify-center gap-1 bg-white hover:border-primary transition-all" style="border-color:var(--border); color:var(--text-faint);" title="Adicionar fotos">
                    <span class="material-symbols-outlined" style="font-size:26px;">add_photo_alternate</span>
                    <span class="text-[10px] font-bold">${currentImages.length ? 'Adicionar' : 'Escolher fotos'}</span>
                </button>`;
        };

        const uploadImages = async (fileList) => {
            const files = [...(fileList || [])].filter(f => f.type.startsWith('image/'));
            if (!files.length) return;
            pendingUploads += files.length; uploading += files.length;
            renderGallery();
            for (const file of files) {           // em sequência: mantém a ordem escolhida
                try {
                    const blob = await Files.resizeImage(file);
                    const url = await DB.uploadImage(`products/${draftId}`, blob);
                    uploadedImages.push(url);
                    currentImages.push(url);
                } catch (e) {
                    console.error(e);
                    toast(`Falha ao enviar "${file.name}": ${e.message || 'erro na nuvem'}`, 'error');
                } finally {
                    pendingUploads--; uploading--;
                    renderGallery();
                }
            }
        };

        /** Apaga fotos do nosso Storage que nenhum produto usa mais (duplicados compartilham fotos). */
        const purgeImages = (urls, products) => {
            const inUse = new Set(products.flatMap(p => imagesOf(p)));
            [...new Set(urls)].filter(u => u && !inUse.has(u)).forEach(u => DB.removeImage(u));
        };

        gallery.addEventListener('click', (e) => {
            if (e.target.closest('#btn-add-photo')) return imgFile.click();
            const cover = e.target.closest('[data-img-cover]');
            if (cover) { const [img] = currentImages.splice(Number(cover.dataset.imgCover), 1); currentImages.unshift(img); return renderGallery(); }
            const rm = e.target.closest('[data-img-remove]');
            if (rm) { currentImages.splice(Number(rm.dataset.imgRemove), 1); renderGallery(); }
        });
        imgFile.onchange = () => { uploadImages(imgFile.files); imgFile.value = ''; };
        gallery.addEventListener('dragover', (e) => e.preventDefault());
        gallery.addEventListener('drop', (e) => { e.preventDefault(); uploadImages(e.dataTransfer.files); });

        const addLink = () => {
            const url = imgInput.value.trim();
            if (!/^https?:\/\//i.test(url)) return toast('Cole um link que comece com http:// ou https://', 'error');
            if (!currentImages.includes(url)) currentImages.push(url);
            imgInput.value = '';
            linkRow.classList.add('hidden');
            renderGallery();
        };
        document.getElementById('btn-image-link').onclick = () => { linkRow.classList.toggle('hidden'); imgInput.focus(); };
        document.getElementById('btn-add-image-link').onclick = addLink;
        imgInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } });

        window.productFiles = (id) => {
            const p = (DB.get('products') || []).find(item => item.id === id);
            if (p) Files.openOrderModal({ id: p.ref || 'Produto', customerName: p.name, items: [{ productId: p.id, name: p.name }] }, 'Arquivos de corte');
        };

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const tbody = document.getElementById('products-tbody');
                if (tbody) {
                    const products = DB.get('products') || [];
                    const filtered = products.filter(p => 
                        p.name.toLowerCase().includes(term) || 
                        (p.category && p.category.toLowerCase().includes(term)) ||
                        (p.ref && p.ref.toLowerCase().includes(term))
                    );
                    
                    if (filtered.length === 0) {
                        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-outline italic">Nenhum produto encontrado.</td></tr>`;
                    } else {
                        tbody.innerHTML = filtered.map(p => Products.renderRow(p)).join('');
                    }
                }
            });
        }

        const renderVariations = () => {
            varContainer.innerHTML = currentVariations.map((v, gIdx) => `
                <div class="p-5 rounded-2xl border bg-slate-50/60" style="border-color:var(--border);">
                    <div class="flex items-end gap-3 mb-4">
                        <div class="flex-1 min-w-0">
                            <label class="!mb-1.5">Nome do grupo <span class="font-normal" style="color:var(--text-faint);">(ex.: Tamanho, Material, Cor)</span></label>
                            <input type="text" value="${esc(v.name)}" oninput="window.updateVariationGroup(${gIdx}, this.value)" placeholder="Ex: Tamanho" class="font-bold">
                        </div>
                        <button type="button" onclick="window.addOption(${gIdx})" class="btn-ghost !px-3 text-xs font-bold flex-shrink-0" style="height:46px;">
                            <span class="material-symbols-outlined !text-sm">add</span> Opção
                        </button>
                        <button type="button" onclick="window.removeVariationGroup(${gIdx})" class="w-11 flex items-center justify-center rounded-xl hover:bg-red-50 hover:text-red-500 transition-all text-slate-400 flex-shrink-0" style="height:46px;" title="Remover grupo">
                            <span class="material-symbols-outlined" style="font-size:20px;">delete</span>
                        </button>
                    </div>

                    ${v.options.length ? `
                    <div class="grid gap-3 px-1 mb-1.5" style="grid-template-columns: minmax(0,1fr) 140px 140px 40px;">
                        <span class="label-caps">Opção</span>
                        <span class="label-caps text-right" title="Somado ao custo base">+ Custo R$</span>
                        <span class="label-caps text-right" title="Somado ao preço base">+ Preço R$</span>
                        <span></span>
                    </div>` : ''}
                    <div class="space-y-2">
                        ${v.options.map((opt, oIdx) => `
                            <div class="grid gap-3 items-center" style="grid-template-columns: minmax(0,1fr) 140px 140px 40px;">
                                <input type="text" value="${esc(opt.name)}" oninput="window.updateOption(${gIdx}, ${oIdx}, 'name', this.value)" placeholder="Ex: 60x40 cm">
                                <input type="number" value="${(Number(opt.cost) || 0).toFixed(2)}" oninput="window.updateOption(${gIdx}, ${oIdx}, 'cost', this.value)" placeholder="0,00" step="0.01" min="0" class="text-right" inputmode="decimal">
                                <input type="number" value="${(Number(opt.price) || 0).toFixed(2)}" oninput="window.updateOption(${gIdx}, ${oIdx}, 'price', this.value)" placeholder="0,00" step="0.01" min="0" class="text-right" inputmode="decimal">
                                <button type="button" onclick="window.removeOption(${gIdx}, ${oIdx})" class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-red-50 hover:text-red-500 transition-all text-slate-400" title="Remover opção">
                                    <span class="material-symbols-outlined" style="font-size:18px;">close</span>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                    ${v.options.length ? `<p class="text-[11px] mt-3" style="color:var(--text-faint);">Os valores adicionais são somados ao custo e ao preço base do produto quando a opção é escolhida.</p>` : ''}
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
            draftId = id || generateId();
            form.reset();
            currentVariations = [];
            currentFiles = [];
            uploadedNow = [];
            removedNow = [];
            currentMaterials = [];
            currentCalc = null;
            currentTiers = [];
            uploadedImages = [];
            currentImages = [];
            originalImages = [];
            linkRow.classList.add('hidden');
            toggleNewCategory(false);
            renderCategories();
            document.getElementById('modal-title').innerText = id ? 'Editar Produto' : 'Novo Produto';
            
            if (id) {
                const products = DB.get('products') || [];
                const p = products.find(item => item.id === id);
                if (p) {
                    document.getElementById('p-name').value = p.name;
                    document.getElementById('p-ref').value = p.ref || '';
                    currentImages = [...imagesOf(p)];
                    originalImages = [...currentImages];
                    renderCategories(p.category);
                    document.getElementById('p-cost').value = (Number(p.cost) || 0).toFixed(2);
                    document.getElementById('p-price').value = (Number(p.price) || 0).toFixed(2);
                    document.getElementById('p-manage-stock').checked = p.manageStock !== false;
                    document.getElementById('p-stock').value = p.stock || 0;
                    document.getElementById('stock-qty-container').style.display = p.manageStock !== false ? 'block' : 'none';
                    currentVariations = JSON.parse(JSON.stringify(p.variations || []));
                    currentFiles = JSON.parse(JSON.stringify(p.files || []));
                    currentMaterials = JSON.parse(JSON.stringify(p.materials || []));
                    currentCalc = p.calc || null;
                    currentTiers = JSON.parse(JSON.stringify(p.priceTiers || []));
                }
            }
            renderTiers();
            
            modal.classList.remove('hidden');
            renderVariations();
            renderFiles();
            renderGallery();
            renderMaterials();
            updateCalc();
        };

        if (document.getElementById('p-manage-stock')) {
            document.getElementById('p-manage-stock').onchange = (e) => {
                document.getElementById('stock-qty-container').style.display = e.target.checked ? 'block' : 'none';
            };
        }

        const closeModal = () => modal.classList.add('hidden');
        const cancelModal = () => {
            if (uploading) return toast('Aguarde terminar o envio dos arquivos.', 'error');
            if (uploadedNow.length) DB.removeFiles(uploadedNow);   // enviados e não salvos
            purgeImages(uploadedImages, DB.get('products') || []);  // fotos enviadas e não salvas
            uploadedNow = [];
            uploadedImages = [];
            closeModal();
        };

        if (btnAdd) btnAdd.onclick = () => openModal();
        if (btnAddEmpty) btnAddEmpty.onclick = () => openModal();
        if (btnClose) btnClose.onclick = cancelModal;
        if (btnCancel) btnCancel.onclick = cancelModal;

        // REMOVED backdrop click close to prevent accidental data loss
        // modal.onclick = (e) => { if (e.target === modal) closeModal(); };

        // Calculator Logic
        const updateCalc = () => {
            const costInput = document.getElementById('p-cost');
            const priceInput = document.getElementById('p-price');
            if (!costInput || !priceInput) return;

            const cost = parseFloat(costInput.value) || 0;
            const finalPrice = parseFloat(priceInput.value) || 0;
            const profit = finalPrice - cost;
            const margin = cost > 0 ? (((finalPrice / cost) - 1) * 100).toFixed(0) : 100;
            const roi = cost > 0 ? (profit / cost * 100).toFixed(0) : 0;

            const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            
            document.getElementById('margin-label').innerText = `${margin}%`;
            document.getElementById('display-price').innerText = fmt(finalPrice);
            document.getElementById('val-cost').innerText = fmt(cost);
            document.getElementById('val-profit').innerText = fmt(profit);
            document.getElementById('roi-text').innerText = `${roi}% ROI`;
            document.getElementById('roi-bar').style.width = `${Math.min(100, roi / 2)}%`;
        };

        ['p-cost', 'p-price'].forEach(id => {
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
                        title: 'Atenção: Produto em Uso!',
                        message: 'Este produto já foi utilizado em vendas ou orçamentos. Excluí-lo não afetará o histórico dos pedidos antigos, mas ele sumirá do catálogo. Deseja excluir mesmo assim?',
                        type: 'warning',
                        confirmLabel: 'Excluir Mesmo Assim',
                        onConfirm: () => {
                            const rest = products.filter(p => p.id !== id);
                            DB.save('products', rest);
                            purgeUnused((prod?.files || []).map(f => f.path), rest);
                            purgeImages(imagesOf(prod), rest);
                            m.default.toast('Produto removido definitivamente', 'info');
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
                        const rest = products.filter(p => p.id !== id);
                        DB.save('products', rest);
                        purgeUnused((prod?.files || []).map(f => f.path), rest);
                            purgeImages(imagesOf(prod), rest);
                        m.default.toast('Produto removido', 'info');
                        Products.render(container);
                    }
                });
            });
        };

        form.onsubmit = (e) => {
            e.preventDefault();
            if (uploading) return toast('Aguarde terminar o envio dos arquivos.', 'error');
            const cost = parseFloat(document.getElementById('p-cost').value) || 0;
            const price = parseFloat(document.getElementById('p-price').value) || 0;

            

            const products = DB.get('products') || [];
            const existing = editingId ? products.find(p => p.id === editingId) : null;
            const data = {
                id: editingId || draftId,
                name: document.getElementById('p-name').value,
                ref: document.getElementById('p-ref').value,
                images: [...currentImages],
                image: currentImages[0] || '',   // capa (usada no catálogo, orçamento e listas)
                category: document.getElementById('p-category').value,
                type: existing?.type || 'un',
                cost: cost,
                price: price,
                status: existing ? existing.status : true,
                manageStock: document.getElementById('p-manage-stock').checked,
                stock: parseInt(document.getElementById('p-stock').value) || 0,
                variations: currentVariations.filter(v => v.name.trim() !== ''),
                files: currentFiles.filter(f => !f.uploading),
                materials: currentMaterials.filter(u => u.materialId && Number(u.qty) > 0),
                calc: currentCalc,
                priceTiers: PriceTiers.of({ priceTiers: (readTiers(), currentTiers) })
            };

            if (editingId) {
                const idx = products.findIndex(p => p.id === editingId);
                if (idx !== -1) products[idx] = { ...products[idx], ...data };
                else products.unshift(data);
            } else {
                products.unshift(data);
            }

            DB.save('products', products);
            purgeUnused(removedNow, products);
            purgeImages([...originalImages, ...uploadedImages], products);  // fotos removidas
            uploadedNow = [];
            removedNow = [];
            uploadedImages = [];
            import('../app.js').then(m => m.default.toast('Produto salvo com sucesso!'));
            closeModal();
            Products.render(container);
        };
    }
};

export default Products;
