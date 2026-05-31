/* Products view */
window.AppViews = window.AppViews || {};

window.AppViews.Products = {
    name: 'ProductsView',
    template: `
        <div>
            <div class="page-header">
                <div>
                    <h1>Маҳсулот</h1>
                    <p>Идоракунии склад: {{ products.length }} маҳсулот</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-secondary" @click="viewMode = viewMode === 'grid' ? 'table' : 'grid'">
                        <Icon :name="viewMode === 'grid' ? 'grid' : 'menu'" :size="16" />
                        {{ viewMode === 'grid' ? 'Карточкаҳо' : 'Ҷадвал' }}
                    </button>
                    <button class="btn btn-primary" @click="openModal()">
                        <Icon name="plus" :size="16" /> Маҳсулоти нав
                    </button>
                </div>
            </div>

            <!-- Search & filters -->
            <div class="filter-row">
                <div style="flex: 1; min-width: 200px; position: relative; max-width: 360px;">
                    <Icon name="search" :size="16" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted)"/>
                    <input v-model="filters.q" class="form-input" style="padding-left: 40px"
                           placeholder="Ҷустуҷӯ бо ном, артикул..." />
                </div>
                <select v-model="filters.category_id" class="form-select" style="max-width: 200px"
                        @change="filters.subcategory_id = ''">
                    <option value="">Ҳама категорияҳо</option>
                    <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
                <select v-model="filters.subcategory_id" class="form-select" style="max-width: 200px">
                    <option value="">Ҳама подкатегорияҳо</option>
                    <option v-for="s in subcategoriesFiltered" :key="s.id" :value="s.id">{{ s.name }}</option>
                </select>
                <select v-model="filters.supplier_id" class="form-select" style="max-width: 200px">
                    <option value="">Ҳама фурушандагон</option>
                    <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
                </select>
                <button class="filter-chip" :class="{ active: filters.low_stock === '1' }"
                        @click="filters.low_stock = filters.low_stock ? '' : '1'">
                    <Icon name="alert-triangle" :size="13" /> Захираи кам
                </button>
            </div>

            <div v-if="loading" class="empty">
                <div class="loader-spinner" style="width: 32px; height: 32px;"></div>
            </div>

            <AppEmpty v-else-if="!filtered.length"
                icon="package"
                title="Маҳсулот ёфт нашуд"
                text="Дар асоси маъдуди шумо ҳеҷ маҳсулоте нест" />

            <!-- Grid view -->
            <div v-else-if="viewMode === 'grid'" class="product-grid">
                <div v-for="p in filtered" :key="p.id" class="product-card" @click="viewDetail(p)">
                    <div class="product-photo">
                        <img v-if="p.photo" :src="p.photo" :alt="p.name" />
                        <Icon v-else name="image" :size="36" />
                    </div>
                    <div class="product-name">{{ p.name }}</div>
                    <div class="product-cat">{{ p.category_name }} · {{ p.subcategory_name }}</div>
                    <div class="product-bottom">
                        <div class="product-price">{{ fmtMoney(p.price, p.currency) }}</div>
                        <div class="product-stock"
                             :class="{ 'stock-warn': p.low_stock }">
                            {{ formatStock(p.stock) }} {{ p.unit }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Table view -->
            <div v-else class="table-wrap">
                <table class="data">
                    <thead>
                        <tr>
                            <th>Маҳсулот</th>
                            <th>Категория</th>
                            <th>Фурушанда</th>
                            <th>Нарх</th>
                            <th>Захира</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="p in filtered" :key="p.id">
                            <td>
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <div style="width: 36px; height: 36px; border-radius: 8px;
                                                background: var(--bg-alt); overflow: hidden;
                                                display: grid; place-items: center; flex-shrink: 0;">
                                        <img v-if="p.photo" :src="p.photo" style="width:100%;height:100%;object-fit:cover" />
                                        <Icon v-else name="image" :size="14" />
                                    </div>
                                    <div>
                                        <div style="font-weight: 600">{{ p.name }}</div>
                                        <div style="font-size: 11px; color: var(--text-muted)">
                                            {{ p.sku || '—' }}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div style="font-size: 12px">{{ p.category_name }}</div>
                                <div style="font-size: 11px; color: var(--text-muted)">{{ p.subcategory_name }}</div>
                            </td>
                            <td>{{ p.supplier_name || '—' }}</td>
                            <td>
                                <strong>{{ fmtMoney(p.price, p.currency) }}</strong>
                                <div style="font-size: 11px; color: var(--text-muted)">
                                    Харид: {{ fmtMoney(p.cost_price, p.currency) }}
                                </div>
                            </td>
                            <td>
                                <span :class="['pill', p.low_stock ? 'pill-orange' : 'pill-green']">
                                    {{ formatStock(p.stock) }} {{ p.unit }}
                                </span>
                            </td>
                            <td>
                                <div class="row-actions">
                                    <button class="btn-icon btn btn-ghost" @click="viewDetail(p)" title="Намоиш">
                                        <Icon name="eye" :size="14" />
                                    </button>
                                    <button class="btn-icon btn btn-ghost" @click="openModal(p)" title="Таҳрир">
                                        <Icon name="edit" :size="14" />
                                    </button>
                                    <button class="btn-icon btn btn-ghost" @click="askDelete(p)" title="Нест">
                                        <Icon name="trash" :size="14" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Edit modal -->
            <AppModal :show="formShow" :title="form.id ? 'Таҳрири маҳсулот' : 'Маҳсулоти нав'"
                      size="lg" @close="formShow = false">
                <div class="form-grid">
                    <div class="form-group full">
                        <ImageUpload v-model="form.photo" label="Илова кардани акси маҳсулот" />
                    </div>
                    <div class="form-group full">
                        <label class="form-label">Номи маҳсулот <span class="req">*</span></label>
                        <input v-model="form.name" class="form-input" placeholder="Масалан: Семент М500 50кг" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Артикул (SKU)</label>
                        <input v-model="form.sku" class="form-input" placeholder="ABC-001" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Воҳид</label>
                        <select v-model="form.unit" class="form-select">
                            <option value="дона">дона</option>
                            <option value="кг">кг</option>
                            <option value="метр">метр</option>
                            <option value="м²">м²</option>
                            <option value="м³">м³</option>
                            <option value="халта">халта</option>
                            <option value="сатил">сатил</option>
                            <option value="комплект">комплект</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Категория <span class="req">*</span></label>
                        <select v-model="formCatId" class="form-select" @change="form.subcategory_id = ''">
                            <option value="">Интихоб...</option>
                            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Подкатегория <span class="req">*</span></label>
                        <select v-model="form.subcategory_id" class="form-select" :disabled="!formCatId">
                            <option value="">Интихоб...</option>
                            <option v-for="s in formSubs" :key="s.id" :value="s.id">{{ s.name }}</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Фурушанда</label>
                        <select v-model="form.supplier_id" class="form-select">
                            <option :value="null">— нест —</option>
                            <option v-for="s in suppliers" :key="s.id" :value="s.id">
                                {{ s.name }} ({{ s.market }})
                            </option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Валюта</label>
                        <select v-model="form.currency" class="form-select">
                            <option value="TJS">TJS — сомонӣ</option>
                            <option value="USD">USD</option>
                            <option value="RUB">RUB</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Нархи фурӯш <span class="req">*</span></label>
                        <input v-model.number="form.price" type="number" step="0.01" min="0" class="form-input" />
                        <div v-if="form.id && origPrice !== null && Number(form.price) !== Number(origPrice)"
                             class="form-help">
                            Нархи пешина: <span class="price-old">{{ fmtMoney(origPrice, form.currency) }}</span>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Нархи харид</label>
                        <input v-model.number="form.cost_price" type="number" step="0.01" min="0" class="form-input" />
                        <div v-if="form.id && origCost !== null && Number(form.cost_price) !== Number(origCost)"
                             class="form-help">
                            Пешина: <span class="price-old">{{ fmtMoney(origCost, form.currency) }}</span>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Захира</label>
                        <input v-model.number="form.stock" type="number" step="0.01" min="0" class="form-input" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Сатҳи минимум</label>
                        <input v-model.number="form.min_stock" type="number" step="0.01" min="0" class="form-input" />
                        <div class="form-help">Барои огоҳии "захираи кам"</div>
                    </div>
                    <div class="form-group full" v-if="form.id && (Number(form.price) !== Number(origPrice) || Number(form.cost_price) !== Number(origCost))">
                        <label class="form-label">Эзоҳ ба тағйири нарх</label>
                        <input v-model="form.price_note" class="form-input" placeholder="Масалан: афзоиши нарх дар бозор" />
                    </div>
                    <div class="form-group full">
                        <label class="form-label">Тавсиф</label>
                        <textarea v-model="form.description" class="form-textarea" placeholder="Маълумоти иловагӣ"></textarea>
                    </div>
                </div>
                <template #footer>
                    <button class="btn btn-ghost" @click="formShow = false">Бекор</button>
                    <button class="btn btn-primary" @click="save"
                            :disabled="!form.name?.trim() || !form.subcategory_id">
                        <Icon name="check" :size="14" /> Захира
                    </button>
                </template>
            </AppModal>

            <!-- Detail modal -->
            <AppModal :show="detailShow" :title="detail?.name || ''" size="lg" @close="detailShow = false">
                <div v-if="detail" class="form-grid">
                    <div class="form-group full" style="display: flex; gap: 16px;">
                        <div style="width: 160px; aspect-ratio: 1; background: var(--bg-alt);
                                    border-radius: 12px; overflow: hidden; flex-shrink: 0;
                                    display: grid; place-items: center;">
                            <img v-if="detail.photo" :src="detail.photo" style="width:100%;height:100%;object-fit:cover"/>
                            <Icon v-else name="image" :size="40" />
                        </div>
                        <div style="flex: 1;">
                            <div style="font-size: 13px; color: var(--text-muted)">{{ detail.category_name }} · {{ detail.subcategory_name }}</div>
                            <h2 style="margin: 4px 0 12px; font-size: 22px">{{ detail.name }}</h2>
                            <div style="display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 14px;">
                                <div>
                                    <div style="font-size: 11px; color: var(--text-muted)">Нархи фурӯш</div>
                                    <div style="font-size: 22px; font-weight: 800; color: var(--green-700)">
                                        {{ fmtMoney(detail.price, detail.currency) }}
                                    </div>
                                </div>
                                <div>
                                    <div style="font-size: 11px; color: var(--text-muted)">Нархи харид</div>
                                    <div style="font-size: 18px; font-weight: 600">
                                        {{ fmtMoney(detail.cost_price, detail.currency) }}
                                    </div>
                                </div>
                                <div>
                                    <div style="font-size: 11px; color: var(--text-muted)">Захира</div>
                                    <div style="font-size: 18px; font-weight: 600"
                                         :style="detail.low_stock ? 'color: var(--orange)' : ''">
                                        {{ formatStock(detail.stock) }} {{ detail.unit }}
                                    </div>
                                </div>
                            </div>
                            <div v-if="detail.supplier_name" style="font-size: 13px;">
                                <Icon name="truck" :size="14" style="vertical-align: -2px" />
                                {{ detail.supplier_name }}
                                <span v-if="detail.supplier_phone" style="color: var(--text-muted)">
                                    · {{ detail.supplier_phone }}
                                </span>
                            </div>
                            <div v-if="detail.description" style="margin-top: 10px; color: var(--text-soft); font-size: 13px;">
                                {{ detail.description }}
                            </div>
                        </div>
                    </div>

                    <div v-if="detail.price_history?.length" class="form-group full">
                        <div class="price-history">
                            <h4>Таърихи тағйири нарх</h4>
                            <div v-for="h in detail.price_history" :key="h.id" class="history-row">
                                <Icon :name="h.new_price > h.old_price ? 'trending-up' : (h.new_price < h.old_price ? 'trending-down' : 'minus')"
                                      :size="14"
                                      :class="h.new_price > h.old_price ? 'price-up' : (h.new_price < h.old_price ? 'price-down' : '')" />
                                <span class="price-old">{{ fmtMoney(h.old_price, detail.currency) }}</span>
                                <Icon name="arrow-right" :size="12" class="history-arrow" />
                                <strong :class="h.new_price > h.old_price ? 'price-up' : (h.new_price < h.old_price ? 'price-down' : '')">
                                    {{ fmtMoney(h.new_price, detail.currency) }}
                                </strong>
                                <span style="margin-left: auto; color: var(--text-muted); font-size: 11px">
                                    {{ fmtDateTime(h.changed_at) }}
                                </span>
                                <span v-if="h.note" style="font-size: 11px; color: var(--text-muted)">
                                    · {{ h.note }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <template #footer>
                    <button class="btn btn-ghost" @click="detailShow = false">Пӯшидан</button>
                    <button class="btn btn-secondary" @click="detailShow = false; openModal(detail)">
                        <Icon name="edit" :size="14" /> Таҳрир
                    </button>
                </template>
            </AppModal>

            <AppConfirm :show="confirm.show"
                        :title="confirm.title"
                        :text="confirm.text"
                        :confirm-text="confirm.confirmText"
                        :danger="true"
                        @close="confirm.show = false"
                        @confirm="confirm.action && confirm.action()" />
        </div>
    `,
    setup() {
        const products = Vue.ref([]);
        const categories = Vue.ref([]);
        const subcategories = Vue.ref([]);
        const suppliers = Vue.ref([]);
        const loading = Vue.ref(false);
        const viewMode = Vue.ref('grid');

        const filters = Vue.reactive({
            q: '', category_id: '', subcategory_id: '', supplier_id: '', low_stock: '',
        });

        const formShow = Vue.ref(false);
        const formCatId = Vue.ref('');
        const form = Vue.reactive({
            id: null, name: '', sku: '', description: '', photo: '',
            price: 0, cost_price: 0, currency: 'TJS', unit: 'дона',
            stock: 0, min_stock: 0,
            subcategory_id: null, supplier_id: null,
            price_note: '',
        });
        const origPrice = Vue.ref(null);
        const origCost = Vue.ref(null);

        const detailShow = Vue.ref(false);
        const detail = Vue.ref(null);

        const confirm = Vue.reactive({ show: false, title: '', text: '', confirmText: '', action: null });

        const subcategoriesFiltered = Vue.computed(() => {
            if (!filters.category_id) return subcategories.value;
            return subcategories.value.filter(s => s.category_id == filters.category_id);
        });

        const formSubs = Vue.computed(() => {
            if (!formCatId.value) return [];
            return subcategories.value.filter(s => s.category_id == formCatId.value);
        });

        const filtered = Vue.computed(() => {
            const q = filters.q.trim().toLowerCase();
            return products.value.filter(p => {
                if (filters.category_id && String(p.category_id) !== String(filters.category_id)) return false;
                if (filters.subcategory_id && String(p.subcategory_id) !== String(filters.subcategory_id)) return false;
                if (filters.supplier_id && String(p.supplier_id) !== String(filters.supplier_id)) return false;
                if (filters.low_stock === '1' && !p.low_stock) return false;
                if (q) {
                    const hay = (p.name + ' ' + (p.sku || '') + ' ' + (p.description || '')).toLowerCase();
                    if (!hay.includes(q)) return false;
                }
                return true;
            });
        });

        function formatStock(v) {
            if (v == null) return '0';
            const n = Number(v);
            return Number.isInteger(n) ? n : n.toFixed(2);
        }

        async function load() {
            loading.value = true;
            try {
                const [p, c, s, sup] = await Promise.all([
                    window.API.products.list(),
                    window.API.categories.list(),
                    window.API.subcategories.list(),
                    window.API.suppliers.list(),
                ]);
                products.value = p; categories.value = c;
                subcategories.value = s; suppliers.value = sup;
            } catch (e) { window.toast.error(e.message); }
            finally { loading.value = false; }
        }

        function openModal(p) {
            if (p) {
                Object.assign(form, {
                    id: p.id, name: p.name, sku: p.sku || '',
                    description: p.description || '', photo: p.photo || '',
                    price: p.price, cost_price: p.cost_price,
                    currency: p.currency, unit: p.unit,
                    stock: p.stock, min_stock: p.min_stock,
                    subcategory_id: p.subcategory_id, supplier_id: p.supplier_id,
                    price_note: '',
                });
                formCatId.value = p.category_id;
                origPrice.value = p.price;
                origCost.value = p.cost_price;
            } else {
                Object.assign(form, {
                    id: null, name: '', sku: '', description: '', photo: '',
                    price: 0, cost_price: 0, currency: 'TJS', unit: 'дона',
                    stock: 0, min_stock: 0,
                    subcategory_id: null, supplier_id: null,
                    price_note: '',
                });
                formCatId.value = '';
                origPrice.value = null; origCost.value = null;
            }
            formShow.value = true;
        }

        async function save() {
            try {
                const payload = { ...form };
                payload.subcategory_id = Number(payload.subcategory_id);
                if (payload.supplier_id == null || payload.supplier_id === '') {
                    payload.supplier_id = null;
                } else {
                    payload.supplier_id = Number(payload.supplier_id);
                }
                if (form.id) {
                    await window.API.products.update(form.id, payload);
                    window.toast.success('Маҳсулот навсозӣ шуд');
                } else {
                    await window.API.products.create(payload);
                    window.toast.success('Маҳсулот илова шуд');
                }
                formShow.value = false;
                await load();
            } catch (e) { window.toast.error(e.message); }
        }

        async function viewDetail(p) {
            try {
                detail.value = await window.API.products.get(p.id);
                detailShow.value = true;
            } catch (e) { window.toast.error(e.message); }
        }

        function askDelete(p) {
            Object.assign(confirm, {
                show: true,
                title: 'Нест кардани маҳсулот',
                text: `Шумо мутмаин ҳастед, ки "${p.name}"-ро нест мекунед?`,
                confirmText: 'Нест кардан',
                action: async () => {
                    try {
                        await window.API.products.remove(p.id);
                        window.toast.success('Маҳсулот нест шуд');
                        confirm.show = false;
                        await load();
                    } catch (e) { window.toast.error(e.message); }
                },
            });
        }

        Vue.onMounted(load);

        return {
            products, categories, subcategories, suppliers,
            loading, viewMode, filters, filtered,
            subcategoriesFiltered, formSubs,
            formShow, form, formCatId, origPrice, origCost,
            detailShow, detail,
            confirm,
            openModal, save, viewDetail, askDelete,
            formatStock,
            fmtMoney: window.fmtMoney, fmtDate: window.fmtDate, fmtDateTime: window.fmtDateTime,
        };
    },
};
