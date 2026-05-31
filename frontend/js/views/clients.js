/* Clients view */
window.AppViews = window.AppViews || {};

window.AppViews.Clients = {
    name: 'ClientsView',
    template: `
        <div>
            <div class="page-header">
                <div>
                    <h1>Клиентҳо</h1>
                    <p>Базаи харидорон ({{ clients.length }})</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-primary" @click="openModal()">
                        <Icon name="plus" :size="16" /> Клиенти нав
                    </button>
                </div>
            </div>

            <div class="filter-row">
                <div style="flex: 1; min-width: 200px; position: relative; max-width: 420px;">
                    <Icon name="search" :size="16" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted)" />
                    <input v-model="q" class="form-input" style="padding-left: 40px"
                           placeholder="Ҷустуҷӯ бо ном, телефон..." />
                </div>
                <button class="filter-chip" :class="{ active: !statusFilter }" @click="statusFilter = ''">Ҳама</button>
                <button class="filter-chip" :class="{ active: statusFilter === 'active' }" @click="statusFilter = 'active'">Фаъол</button>
                <button class="filter-chip" :class="{ active: statusFilter === 'vip' }" @click="statusFilter = 'vip'">VIP</button>
                <button class="filter-chip" :class="{ active: statusFilter === 'blocked' }" @click="statusFilter = 'blocked'">Манъ</button>
            </div>

            <div v-if="loading" class="empty">
                <div class="loader-spinner" style="width: 32px; height: 32px;"></div>
            </div>

            <AppEmpty v-else-if="!filtered.length"
                icon="users"
                title="Клиент нест"
                text="Клиенти аввалини худро илова кунед" />

            <div v-else class="table-wrap">
                <table class="data">
                    <thead>
                        <tr>
                            <th>Клиент</th>
                            <th>Телефон</th>
                            <th>Суроға</th>
                            <th>Статус</th>
                            <th>Заявкаҳо</th>
                            <th>Маблағи умумӣ</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="c in filtered" :key="c.id">
                            <td>
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <div style="width: 36px; height: 36px; border-radius: 50%;
                                                background: linear-gradient(135deg, var(--green-400), var(--green-700));
                                                color: white; display: grid; place-items: center;
                                                font-weight: 700; flex-shrink: 0;">
                                        {{ initials(c.name) }}
                                    </div>
                                    <div>
                                        <div style="font-weight: 600">{{ c.name }}</div>
                                        <div style="font-size: 11px; color: var(--text-muted)">
                                            {{ c.company || 'Шахсӣ' }}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td>{{ c.phone || '—' }}</td>
                            <td style="font-size: 12px; color: var(--text-soft); max-width: 240px;">
                                {{ c.address || '—' }}
                            </td>
                            <td>
                                <span :class="['pill', statusPill(c.status)]">{{ statusLabel(c.status) }}</span>
                            </td>
                            <td><strong>{{ c.orders_count }}</strong></td>
                            <td><strong style="color: var(--green-700)">{{ fmtMoney(c.total_spent) }}</strong></td>
                            <td>
                                <div class="row-actions">
                                    <button class="btn-icon btn btn-ghost" @click="viewDetail(c)" title="Намоиш">
                                        <Icon name="eye" :size="14" />
                                    </button>
                                    <button class="btn-icon btn btn-ghost" @click="openModal(c)" title="Таҳрир">
                                        <Icon name="edit" :size="14" />
                                    </button>
                                    <button class="btn-icon btn btn-ghost" @click="askDelete(c)" title="Нест">
                                        <Icon name="trash" :size="14" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Form -->
            <AppModal :show="formShow" :title="form.id ? 'Таҳрири клиент' : 'Клиенти нав'"
                      size="lg" @close="formShow = false">
                <div class="form-grid">
                    <div class="form-group full">
                        <label class="form-label">Ном ва насаб <span class="req">*</span></label>
                        <input v-model="form.name" class="form-input" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Ширкат</label>
                        <input v-model="form.company" class="form-input" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Статус</label>
                        <select v-model="form.status" class="form-select">
                            <option value="active">Фаъол</option>
                            <option value="vip">VIP</option>
                            <option value="blocked">Манъ</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Телефон</label>
                        <input v-model="form.phone" class="form-input" placeholder="+992..." />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Телефони иловагӣ</label>
                        <input v-model="form.phone2" class="form-input" />
                    </div>
                    <div class="form-group full">
                        <label class="form-label">Email</label>
                        <input v-model="form.email" type="email" class="form-input" />
                    </div>
                    <div class="form-group full">
                        <label class="form-label">Суроға</label>
                        <input v-model="form.address" class="form-input" placeholder="Шаҳр, кӯча, хона..." />
                    </div>
                    <div class="form-group full">
                        <label class="form-label">Эзоҳ</label>
                        <textarea v-model="form.notes" class="form-textarea"></textarea>
                    </div>
                </div>
                <template #footer>
                    <button class="btn btn-ghost" @click="formShow = false">Бекор</button>
                    <button class="btn btn-primary" @click="save" :disabled="!form.name?.trim()">
                        <Icon name="check" :size="14" /> Захира
                    </button>
                </template>
            </AppModal>

            <!-- Detail -->
            <AppModal :show="detailShow" :title="detail?.name || ''" size="lg" @close="detailShow = false">
                <div v-if="detail">
                    <div class="stats-grid" style="margin-bottom: 18px; grid-template-columns: repeat(3, 1fr);">
                        <div class="stat-card">
                            <div class="stat-label">Заявкаҳо</div>
                            <div class="stat-value">{{ detail.orders_count }}</div>
                        </div>
                        <div class="stat-card highlight">
                            <div class="stat-label">Маблағи умумӣ</div>
                            <div class="stat-value">{{ fmtMoney(detail.total_spent) }}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Статус</div>
                            <div class="stat-value" style="font-size: 18px; padding-top: 6px;">
                                <span :class="['pill', statusPill(detail.status)]">{{ statusLabel(detail.status) }}</span>
                            </div>
                        </div>
                    </div>

                    <div class="form-grid" style="margin-bottom: 18px;">
                        <div class="form-group">
                            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase">Телефон</div>
                            <div style="font-weight: 600">{{ detail.phone || '—' }}</div>
                        </div>
                        <div class="form-group">
                            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase">Email</div>
                            <div style="font-weight: 600">{{ detail.email || '—' }}</div>
                        </div>
                        <div class="form-group full">
                            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase">Суроға</div>
                            <div style="font-weight: 600">{{ detail.address || '—' }}</div>
                        </div>
                        <div v-if="detail.notes" class="form-group full">
                            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase">Эзоҳ</div>
                            <div>{{ detail.notes }}</div>
                        </div>
                    </div>

                    <h4 style="margin: 16px 0 10px; font-size: 14px;">Заявкаҳои клиент</h4>
                    <div v-if="detail.orders?.length" class="table-wrap">
                        <table class="data">
                            <thead>
                                <tr>
                                    <th>№</th>
                                    <th>Сана</th>
                                    <th>Статус</th>
                                    <th>Маблағ</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="o in detail.orders" :key="o.id">
                                    <td><strong>{{ o.order_number }}</strong></td>
                                    <td>{{ fmtDate(o.created_at) }}</td>
                                    <td><span :class="['pill', statusPill(o.status)]">{{ statusLabel(o.status) }}</span></td>
                                    <td><strong>{{ fmtMoney(o.total) }}</strong></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <AppEmpty v-else icon="shopping-cart" title="Заявка нест" text="Ин клиент то ҳол хариде накардааст" />
                </div>
                <template #footer>
                    <button class="btn btn-ghost" @click="detailShow = false">Пӯшидан</button>
                </template>
            </AppModal>

            <AppConfirm :show="confirm.show" :title="confirm.title" :text="confirm.text"
                        :confirm-text="confirm.confirmText" :danger="true"
                        @close="confirm.show = false"
                        @confirm="confirm.action && confirm.action()" />
        </div>
    `,
    setup() {
        const clients = Vue.ref([]);
        const loading = Vue.ref(false);
        const q = Vue.ref('');
        const statusFilter = Vue.ref('');

        const formShow = Vue.ref(false);
        const form = Vue.reactive({
            id: null, name: '', phone: '', phone2: '', email: '',
            address: '', company: '', notes: '', status: 'active',
        });

        const detailShow = Vue.ref(false);
        const detail = Vue.ref(null);

        const confirm = Vue.reactive({ show: false, title: '', text: '', confirmText: '', action: null });

        const filtered = Vue.computed(() => {
            const s = q.value.trim().toLowerCase();
            return clients.value.filter(c => {
                if (statusFilter.value && c.status !== statusFilter.value) return false;
                if (!s) return true;
                const hay = (c.name + ' ' + (c.phone || '') + ' ' + (c.company || '')).toLowerCase();
                return hay.includes(s);
            });
        });

        function initials(name) {
            return name.split(/\s+/).slice(0, 2).map(s => s[0] || '').join('').toUpperCase();
        }

        async function load() {
            loading.value = true;
            try { clients.value = await window.API.clients.list(); }
            catch (e) { window.toast.error(e.message); }
            finally { loading.value = false; }
        }

        function openModal(c) {
            if (c) {
                Object.assign(form, {
                    id: c.id, name: c.name, phone: c.phone, phone2: c.phone2,
                    email: c.email, address: c.address, company: c.company,
                    notes: c.notes, status: c.status,
                });
            } else {
                Object.assign(form, {
                    id: null, name: '', phone: '', phone2: '', email: '',
                    address: '', company: '', notes: '', status: 'active',
                });
            }
            formShow.value = true;
        }

        async function save() {
            try {
                if (form.id) {
                    await window.API.clients.update(form.id, form);
                    window.toast.success('Клиент навсозӣ шуд');
                } else {
                    await window.API.clients.create(form);
                    window.toast.success('Клиент илова шуд');
                }
                formShow.value = false;
                await load();
            } catch (e) { window.toast.error(e.message); }
        }

        async function viewDetail(c) {
            try {
                detail.value = await window.API.clients.get(c.id);
                detailShow.value = true;
            } catch (e) { window.toast.error(e.message); }
        }

        function askDelete(c) {
            Object.assign(confirm, {
                show: true,
                title: 'Нест кардани клиент',
                text: `"${c.name}" ва ҳамаи заявкаҳои он нест мешаванд!`,
                confirmText: 'Нест кардан',
                action: async () => {
                    try {
                        await window.API.clients.remove(c.id);
                        window.toast.success('Клиент нест шуд');
                        confirm.show = false;
                        await load();
                    } catch (e) { window.toast.error(e.message); }
                },
            });
        }

        Vue.onMounted(load);

        return {
            clients, filtered, loading, q, statusFilter,
            formShow, form,
            detailShow, detail,
            confirm,
            openModal, save, viewDetail, askDelete,
            initials,
            fmtMoney: window.fmtMoney, fmtDate: window.fmtDate,
            statusLabel: window.statusLabel, statusPill: window.statusPill,
        };
    },
};
