/* Orders view */
window.AppViews = window.AppViews || {};

window.AppViews.Orders = {
    name: 'OrdersView',
    template: `
        <div>
            <div class="page-header">
                <div>
                    <h1>Заявкаҳо</h1>
                    <p>Фармоишҳои клиентҳо ({{ orders.length }})</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-primary" @click="newOrder()">
                        <Icon name="plus" :size="16" /> Заявкаи нав
                    </button>
                </div>
            </div>

            <!-- Status filter chips -->
            <div class="filter-row">
                <div style="flex: 1; min-width: 200px; position: relative; max-width: 360px;">
                    <Icon name="search" :size="16" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted)" />
                    <input v-model="q" class="form-input" style="padding-left: 40px"
                           placeholder="Ҷустуҷӯ бо рақам..." />
                </div>
                <button class="filter-chip" :class="{ active: !statusFilter }" @click="statusFilter = ''">
                    Ҳама ({{ orders.length }})
                </button>
                <button class="filter-chip" :class="{ active: statusFilter === 'new' }" @click="statusFilter = 'new'">
                    Нав ({{ countByStatus('new') }})
                </button>
                <button class="filter-chip" :class="{ active: statusFilter === 'in_progress' }" @click="statusFilter = 'in_progress'">
                    Дар ҳол ({{ countByStatus('in_progress') }})
                </button>
                <button class="filter-chip" :class="{ active: statusFilter === 'completed' }" @click="statusFilter = 'completed'">
                    Анҷом ({{ countByStatus('completed') }})
                </button>
                <button class="filter-chip" :class="{ active: statusFilter === 'cancelled' }" @click="statusFilter = 'cancelled'">
                    Бекор ({{ countByStatus('cancelled') }})
                </button>
            </div>

            <div v-if="loading" class="empty">
                <div class="loader-spinner" style="width: 32px; height: 32px;"></div>
            </div>

            <AppEmpty v-else-if="!filtered.length"
                icon="shopping-cart"
                title="Заявка нест"
                text="Ҳоло ҳеҷ фармоиш бақайд гирифта нашудааст" />

            <div v-else class="table-wrap">
                <table class="data">
                    <thead>
                        <tr>
                            <th>№</th>
                            <th>Клиент</th>
                            <th>Сана</th>
                            <th>Маҳсулот</th>
                            <th>Маблағ</th>
                            <th>Статус</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="o in filtered" :key="o.id">
                            <td><strong>{{ o.order_number }}</strong></td>
                            <td>
                                <div style="font-weight: 600">{{ o.client_name }}</div>
                                <div style="font-size: 11px; color: var(--text-muted)">{{ o.client_phone }}</div>
                            </td>
                            <td>{{ fmtDate(o.created_at) }}</td>
                            <td><span class="pill pill-gray">{{ o.items_count }} ном</span></td>
                            <td><strong style="color: var(--green-700)">{{ fmtMoney(o.total) }}</strong></td>
                            <td>
                                <select :value="o.status" @change="changeStatus(o, $event.target.value)"
                                        :class="['pill', statusPill(o.status)]"
                                        style="border: none; cursor: pointer; font-weight: 600; outline: none; padding: 4px 8px;">
                                    <option value="new">Нав</option>
                                    <option value="in_progress">Дар ҳол</option>
                                    <option value="completed">Анҷом</option>
                                    <option value="cancelled">Бекор</option>
                                </select>
                            </td>
                            <td>
                                <div class="row-actions">
                                    <button class="btn-icon btn btn-ghost" @click="viewDetail(o)" title="Намоиш">
                                        <Icon name="eye" :size="14" />
                                    </button>
                                    <button class="btn-icon btn btn-ghost" @click="printOrder(o)" title="Чек чоп кардан">
                                        <Icon name="printer" :size="14" />
                                    </button>
                                    <button class="btn-icon btn btn-ghost" @click="askDelete(o)" title="Нест">
                                        <Icon name="trash" :size="14" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Order Form Modal (Wrapper for OrderForm component) -->
            <AppModal :show="formShow" :title="'Заявкаи нав'" size="xl" @close="formShow = false">
                <OrderForm v-if="formShow" @saved="onSaved" @cancel="formShow = false" />
            </AppModal>

            <!-- Detail / Receipt -->
            <AppModal :show="detailShow" :title="'Заявка ' + (detail?.order_number || '')"
                      size="lg" @close="detailShow = false">
                <div v-if="detail">
                    <div id="receipt-print" class="receipt">
                        <div class="receipt-header">
                            <h3>AliStroy CRM</h3>
                            <p>Склади маҳсулоти сохтмонӣ</p>
                            <p>{{ fmtDateTime(detail.created_at) }}</p>
                        </div>

                        <div class="receipt-row">
                            <span>Заявка №:</span>
                            <strong>{{ detail.order_number }}</strong>
                        </div>
                        <div class="receipt-row">
                            <span>Клиент:</span>
                            <strong>{{ detail.client_name }}</strong>
                        </div>
                        <div class="receipt-row">
                            <span>Тел:</span>
                            <strong>{{ detail.client_phone || '—' }}</strong>
                        </div>
                        <div class="receipt-row" v-if="detail.delivery_address">
                            <span>Расондан:</span>
                            <strong style="text-align: right; max-width: 60%; font-size: 11px;">
                                {{ detail.delivery_address }}
                            </strong>
                        </div>
                        <div class="receipt-row">
                            <span>Статус:</span>
                            <span :class="['pill', statusPill(detail.status)]">{{ statusLabel(detail.status) }}</span>
                        </div>

                        <div class="receipt-items">
                            <div v-for="(item, idx) in detail.items" :key="item.id" class="receipt-item-row">
                                <div class="name">{{ idx + 1 }}. {{ item.product_name }}</div>
                                <div class="calc">
                                    <span>{{ item.quantity }} {{ item.unit }} × {{ fmtMoney(item.price) }}</span>
                                    <strong>{{ fmtMoney(item.total) }}</strong>
                                </div>
                            </div>
                        </div>

                        <div class="receipt-row">
                            <span>Маблағи умумӣ:</span>
                            <strong>{{ fmtMoney(detail.subtotal) }}</strong>
                        </div>
                        <div class="receipt-row" v-if="detail.discount > 0">
                            <span>Тахфиф:</span>
                            <strong style="color: var(--red)">−{{ fmtMoney(detail.discount) }}</strong>
                        </div>
                        <div class="receipt-total">
                            <span>Барои пардохт:</span>
                            <span>{{ fmtMoney(detail.total) }}</span>
                        </div>

                        <div v-if="detail.notes" style="margin-top: 14px; font-size: 11px; color: var(--text-muted); text-align: center;">
                            {{ detail.notes }}
                        </div>

                        <div style="text-align: center; margin-top: 20px; font-size: 11px; color: var(--text-muted);">
                            Раҳмат барои хариди шумо!
                        </div>
                    </div>
                </div>
                <template #footer>
                    <button class="btn btn-ghost" @click="detailShow = false">Пӯшидан</button>
                    <button class="btn btn-primary" @click="printOrder(detail)">
                        <Icon name="printer" :size="14" /> Чоп / Чек
                    </button>
                </template>
            </AppModal>

            <AppConfirm :show="confirm.show" :title="confirm.title" :text="confirm.text"
                        :confirm-text="confirm.confirmText" :danger="true"
                        @close="confirm.show = false"
                        @confirm="confirm.action && confirm.action()" />
        </div>
    `,
    setup() {
        const orders = Vue.ref([]);
        const loading = Vue.ref(false);
        const q = Vue.ref('');
        const statusFilter = Vue.ref('');

        const formShow = Vue.ref(false);

        const detailShow = Vue.ref(false);
        const detail = Vue.ref(null);

        const confirm = Vue.reactive({ show: false, title: '', text: '', confirmText: '', action: null });

        const filtered = Vue.computed(() => {
            const s = q.value.trim().toLowerCase();
            return orders.value.filter(o => {
                if (statusFilter.value && o.status !== statusFilter.value) return false;
                if (!s) return true;
                return (o.order_number + ' ' + o.client_name).toLowerCase().includes(s);
            });
        });

        function countByStatus(status) {
            return orders.value.filter(o => o.status === status).length;
        }

        async function load() {
            loading.value = true;
            try { orders.value = await window.API.orders.list(); }
            catch (e) { window.toast.error(e.message); }
            finally { loading.value = false; }
        }

        function newOrder() { formShow.value = true; }

        async function onSaved() {
            formShow.value = false;
            await load();
            window.toast.success('Заявка қабул шуд');
        }

        async function changeStatus(o, status) {
            try {
                await window.API.orders.update(o.id, { status });
                o.status = status;
                window.toast.success('Статус навсозӣ шуд');
            } catch (e) { window.toast.error(e.message); }
        }

        async function viewDetail(o) {
            try {
                detail.value = await window.API.orders.get(o.id);
                detailShow.value = true;
            } catch (e) { window.toast.error(e.message); }
        }

        async function printOrder(o) {
            if (!o) return;
            // Агар заявка пурра бор нашуда бошад — бор кардан
            if (!o.items) {
                try { detail.value = await window.API.orders.get(o.id); }
                catch (e) { window.toast.error(e.message); return; }
            }
            await Vue.nextTick();
            const node = document.getElementById('receipt-print');
            if (!node) {
                detailShow.value = true;
                await Vue.nextTick();
                setTimeout(() => printOrder(detail.value), 200);
                return;
            }
            const html = node.outerHTML;
            const w = window.open('', '_blank', 'width=420,height=700');
            if (!w) {
                window.toast.error('Барои чоп popup-ро иҷозат диҳед');
                return;
            }
            w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
                <title>Чек ${detail.value?.order_number || ''}</title>
                <link rel="stylesheet" href="/css/styles.css" />
                <style>
                    body { padding: 16px; background: white; }
                    .receipt { box-shadow: none; max-width: 100%; }
                </style>
                </head><body>${html}<script>
                    window.onload = function () {
                        setTimeout(function () { window.print(); }, 300);
                    };
                <\/script></body></html>`);
            w.document.close();
        }

        function askDelete(o) {
            Object.assign(confirm, {
                show: true,
                title: 'Нест кардани заявка',
                text: `Заявкаи "${o.order_number}" нест карда мешавад. Захираи маҳсулот барқарор хоҳад шуд.`,
                confirmText: 'Нест кардан',
                action: async () => {
                    try {
                        await window.API.orders.remove(o.id);
                        window.toast.success('Заявка нест шуд');
                        confirm.show = false;
                        await load();
                    } catch (e) { window.toast.error(e.message); }
                },
            });
        }

        Vue.onMounted(load);

        return {
            orders, filtered, loading, q, statusFilter,
            formShow, detailShow, detail,
            confirm,
            newOrder, onSaved, changeStatus,
            viewDetail, printOrder, askDelete,
            countByStatus,
            fmtMoney: window.fmtMoney, fmtDate: window.fmtDate, fmtDateTime: window.fmtDateTime,
            statusLabel: window.statusLabel, statusPill: window.statusPill,
        };
    },
};
