/* Order Form — сохтани заявкаи нав бо интихоби маҳсулот ва нархи автоматӣ */
window.AppViews = window.AppViews || {};

window.AppViews.OrderForm = {
    name: 'OrderForm',
    emits: ['saved', 'cancel'],
    template: `
        <div>
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Клиент <span class="req">*</span></label>
                    <div style="display: flex; gap: 8px;">
                        <select v-model="form.client_id" class="form-select" @change="onClientChange">
                            <option :value="null">— Интихоб клиент —</option>
                            <option v-for="c in clients" :key="c.id" :value="c.id">
                                {{ c.name }} ({{ c.phone || 'без тел' }})
                            </option>
                        </select>
                        <button class="btn btn-secondary btn-sm" @click="newClientShow = true" type="button" title="Илова клиенти нав">
                            <Icon name="plus" :size="14" />
                        </button>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Санаи расонидан</label>
                    <input v-model="form.delivery_date" type="date" class="form-input" />
                </div>
                <div class="form-group full">
                    <label class="form-label">Суроғаи расонидан</label>
                    <input v-model="form.delivery_address" class="form-input" placeholder="Шаҳр, кӯча..." />
                </div>
            </div>

            <h4 style="margin: 20px 0 10px; font-size: 14px;">Маҳсулот дар заявка</h4>

            <!-- Add product row -->
            <div style="display: flex; gap: 8px; margin-bottom: 12px; align-items: stretch; flex-wrap: wrap;">
                <div style="flex: 2; min-width: 220px; position: relative;">
                    <input v-model="search" class="form-input" placeholder="Ҷустуҷӯи маҳсулот..." />
                    <div v-if="search && searchResults.length"
                         style="position: absolute; top: 100%; left: 0; right: 0; z-index: 10;
                                background: white; border: 1px solid var(--border); border-radius: 10px;
                                margin-top: 4px; box-shadow: var(--shadow-md); max-height: 280px;
                                overflow-y: auto;">
                        <button v-for="p in searchResults" :key="p.id"
                                @click="addProduct(p)" type="button"
                                style="display: flex; align-items: center; gap: 10px; width: 100%;
                                       padding: 10px 12px; border: none; background: transparent;
                                       text-align: right; border-bottom: 1px solid var(--border); cursor: pointer;">
                            <div style="width: 32px; height: 32px; border-radius: 6px;
                                        background: var(--bg-alt); flex-shrink: 0;
                                        display: grid; place-items: center;">
                                <img v-if="p.photo" :src="p.photo" style="width:100%;height:100%;object-fit:cover;border-radius:6px"/>
                                <Icon v-else name="image" :size="14" />
                            </div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 600; font-size: 13px;
                                            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    {{ p.name }}
                                </div>
                                <div style="font-size: 11px; color: var(--text-muted);">
                                    {{ p.subcategory_name }} · захира: {{ p.stock }} {{ p.unit }}
                                </div>
                            </div>
                            <div style="font-weight: 700; color: var(--green-700);">
                                {{ fmtMoney(p.price, p.currency) }}
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            <div v-if="!form.items.length" class="empty" style="padding: 30px;">
                <Icon name="shopping-cart" :size="36" style="color: var(--text-muted)"/>
                <p>Барои оғоз маҳсулот аз ҷустуҷӯи боло интихоб кунед</p>
            </div>

            <div v-else class="table-wrap">
                <table class="data">
                    <thead>
                        <tr>
                            <th>Маҳсулот</th>
                            <th style="width: 120px">Нарх</th>
                            <th style="width: 140px">Миқдор</th>
                            <th style="width: 120px">Ҷамъ</th>
                            <th style="width: 50px"></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(it, idx) in form.items" :key="idx">
                            <td>
                                <strong>{{ it.product_name }}</strong>
                                <div style="font-size: 11px; color: var(--text-muted)">{{ it.unit }}</div>
                            </td>
                            <td>
                                <input v-model.number="it.price" type="number" step="0.01" min="0"
                                       class="form-input" style="padding: 6px 10px"
                                       @input="recalc" />
                            </td>
                            <td>
                                <div style="display: flex; align-items: center; gap: 4px;">
                                    <button class="btn btn-ghost btn-icon" type="button"
                                            @click="it.quantity = Math.max(1, (it.quantity || 1) - 1); recalc()">
                                        <Icon name="minus" :size="12"/>
                                    </button>
                                    <input v-model.number="it.quantity" type="number" step="0.01" min="0.01"
                                           class="form-input" style="padding: 6px 10px; text-align: center;"
                                           @input="recalc" />
                                    <button class="btn btn-ghost btn-icon" type="button"
                                            @click="it.quantity = (it.quantity || 0) + 1; recalc()">
                                        <Icon name="plus" :size="12"/>
                                    </button>
                                </div>
                            </td>
                            <td><strong>{{ fmtMoney(it.total) }}</strong></td>
                            <td>
                                <button class="btn-icon btn btn-ghost" type="button"
                                        @click="removeItem(idx)">
                                    <Icon name="trash" :size="14" />
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="form-grid" style="margin-top: 20px;">
                <div class="form-group">
                    <label class="form-label">Тахфиф</label>
                    <input v-model.number="form.discount" type="number" min="0" step="0.01"
                           class="form-input" @input="recalc" />
                </div>
                <div class="form-group">
                    <label class="form-label">Статус</label>
                    <select v-model="form.status" class="form-select">
                        <option value="new">Нав</option>
                        <option value="in_progress">Дар ҳол</option>
                        <option value="completed">Анҷом</option>
                    </select>
                </div>
                <div class="form-group full">
                    <label class="form-label">Эзоҳ</label>
                    <textarea v-model="form.notes" class="form-textarea"
                              placeholder="Иттилооти иловагӣ оид ба заявка..."></textarea>
                </div>
            </div>

            <!-- Total summary -->
            <div style="margin-top: 16px; padding: 16px;
                        background: var(--green-50); border-radius: 12px;
                        display: flex; align-items: center; justify-content: space-between;
                        flex-wrap: wrap; gap: 12px;">
                <div>
                    <div style="font-size: 12px; color: var(--green-800); font-weight: 600;">МАБЛАҒИ УМУМӢ</div>
                    <div style="font-size: 28px; font-weight: 800; color: var(--green-700);">
                        {{ fmtMoney(total) }}
                    </div>
                </div>
                <div style="text-align: left; font-size: 12px; color: var(--text-soft);">
                    <div>Маҳсулот: <strong>{{ form.items.length }}</strong></div>
                    <div>Зерҷамъ: <strong>{{ fmtMoney(subtotal) }}</strong></div>
                    <div v-if="form.discount > 0">Тахфиф: <strong style="color: var(--red)">−{{ fmtMoney(form.discount) }}</strong></div>
                </div>
            </div>

            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 22px;">
                <button class="btn btn-ghost" @click="$emit('cancel')" type="button">Бекор</button>
                <button class="btn btn-primary" @click="save" type="button"
                        :disabled="!form.client_id || !form.items.length || saving">
                    <Icon name="check" :size="14" /> {{ saving ? 'Захира карда истода...' : 'Захира кардани заявка' }}
                </button>
            </div>

            <!-- Quick "new client" modal -->
            <AppModal :show="newClientShow" title="Клиенти нав" @close="newClientShow = false">
                <div class="form-grid">
                    <div class="form-group full">
                        <label class="form-label">Ном <span class="req">*</span></label>
                        <input v-model="newClient.name" class="form-input" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Телефон</label>
                        <input v-model="newClient.phone" class="form-input" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Ширкат</label>
                        <input v-model="newClient.company" class="form-input" />
                    </div>
                    <div class="form-group full">
                        <label class="form-label">Суроға</label>
                        <input v-model="newClient.address" class="form-input" />
                    </div>
                </div>
                <template #footer>
                    <button class="btn btn-ghost" @click="newClientShow = false" type="button">Бекор</button>
                    <button class="btn btn-primary" @click="saveNewClient" type="button"
                            :disabled="!newClient.name?.trim()">
                        <Icon name="check" :size="14" /> Захира
                    </button>
                </template>
            </AppModal>
        </div>
    `,
    setup(props, { emit }) {
        const clients = Vue.ref([]);
        const products = Vue.ref([]);
        const search = Vue.ref('');
        const saving = Vue.ref(false);

        const form = Vue.reactive({
            client_id: null,
            delivery_address: '',
            delivery_date: '',
            notes: '',
            status: 'new',
            discount: 0,
            items: [],
        });

        const newClientShow = Vue.ref(false);
        const newClient = Vue.reactive({ name: '', phone: '', company: '', address: '' });

        const searchResults = Vue.computed(() => {
            const q = search.value.trim().toLowerCase();
            if (!q) return [];
            return products.value
                .filter(p => p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q))
                .slice(0, 8);
        });

        const subtotal = Vue.computed(() => form.items.reduce((s, it) => s + (it.total || 0), 0));
        const total = Vue.computed(() => Math.max(0, subtotal.value - (form.discount || 0)));

        async function load() {
            try {
                const [c, p] = await Promise.all([
                    window.API.clients.list(),
                    window.API.products.list(),
                ]);
                clients.value = c;
                products.value = p;
            } catch (e) { window.toast.error(e.message); }
        }

        function onClientChange() {
            const c = clients.value.find(x => x.id == form.client_id);
            if (c && !form.delivery_address) form.delivery_address = c.address || '';
        }

        function addProduct(p) {
            const exist = form.items.find(it => it.product_id === p.id);
            if (exist) {
                exist.quantity += 1;
            } else {
                form.items.push({
                    product_id: p.id,
                    product_name: p.name,
                    unit: p.unit,
                    price: p.price,
                    quantity: 1,
                    total: p.price,
                });
            }
            search.value = '';
            recalc();
        }

        function removeItem(idx) { form.items.splice(idx, 1); recalc(); }

        function recalc() {
            form.items.forEach(it => {
                it.total = (Number(it.price) || 0) * (Number(it.quantity) || 0);
            });
        }

        async function save() {
            if (!form.client_id || !form.items.length) return;
            saving.value = true;
            try {
                const payload = {
                    client_id: form.client_id,
                    delivery_address: form.delivery_address,
                    delivery_date: form.delivery_date || null,
                    notes: form.notes,
                    status: form.status,
                    discount: form.discount || 0,
                    items: form.items.map(it => ({
                        product_id: it.product_id,
                        quantity: it.quantity,
                        price: it.price,
                    })),
                };
                await window.API.orders.create(payload);
                emit('saved');
            } catch (e) {
                window.toast.error(e.message);
            } finally { saving.value = false; }
        }

        async function saveNewClient() {
            if (!newClient.name?.trim()) return;
            try {
                const c = await window.API.clients.create({ ...newClient });
                clients.value.push(c);
                form.client_id = c.id;
                if (c.address) form.delivery_address = c.address;
                Object.assign(newClient, { name: '', phone: '', company: '', address: '' });
                newClientShow.value = false;
                window.toast.success('Клиент илова шуд');
            } catch (e) { window.toast.error(e.message); }
        }

        Vue.onMounted(load);

        return {
            clients, products, search, searchResults, saving,
            form, subtotal, total,
            newClientShow, newClient,
            onClientChange, addProduct, removeItem, recalc,
            save, saveNewClient,
            fmtMoney: window.fmtMoney,
        };
    },
};
