/* Suppliers view */
window.AppViews = window.AppViews || {};

window.AppViews.Suppliers = {
    name: 'SuppliersView',
    template: `
        <div>
            <div class="page-header">
                <div>
                    <h1>Фурушандагон</h1>
                    <p>Партнёрҳои савдо аз бозорҳои сохтмонӣ ({{ suppliers.length }})</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-primary" @click="openModal()">
                        <Icon name="plus" :size="16" /> Фурушандаи нав
                    </button>
                </div>
            </div>

            <div class="filter-row">
                <div style="flex: 1; min-width: 200px; position: relative; max-width: 420px;">
                    <Icon name="search" :size="16" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted)" />
                    <input v-model="q" class="form-input" style="padding-left: 40px"
                           placeholder="Ҷустуҷӯ бо ном, ширкат, бозор..." />
                </div>
            </div>

            <div v-if="loading" class="empty">
                <div class="loader-spinner" style="width: 32px; height: 32px;"></div>
            </div>

            <AppEmpty v-else-if="!filtered.length"
                icon="truck"
                title="Фурушанда нест"
                text="Барои оғоз фурушандаи аввалини худро илова кунед" />

            <div v-else class="cat-grid">
                <div v-for="s in filtered" :key="s.id" class="cat-block">
                    <div class="cat-block-header" style="border-color: var(--blue)">
                        <div class="cat-icon" style="background: var(--blue)">
                            <Icon name="truck" :size="20" />
                        </div>
                        <div class="cat-meta">
                            <h3>{{ s.name }}</h3>
                            <div class="cat-stats">
                                {{ s.company || 'Шахсӣ' }} ·
                                {{ s.products_count }} маҳсулот
                            </div>
                        </div>
                        <div class="cat-actions">
                            <button class="btn-icon btn btn-ghost" @click="viewDetail(s)" title="Намоиш">
                                <Icon name="eye" :size="14" />
                            </button>
                            <button class="btn-icon btn btn-ghost" @click="openModal(s)" title="Таҳрир">
                                <Icon name="edit" :size="14" />
                            </button>
                            <button class="btn-icon btn btn-ghost" @click="askDelete(s)" title="Нест">
                                <Icon name="trash" :size="14" />
                            </button>
                        </div>
                    </div>
                    <div style="padding: 12px 16px; display: flex; flex-direction: column; gap: 6px; font-size: 13px;">
                        <div v-if="s.phone" style="display: flex; align-items: center; gap: 8px; color: var(--text-soft)">
                            <Icon name="phone" :size="13" /> {{ s.phone }}
                        </div>
                        <div v-if="s.market" style="display: flex; align-items: center; gap: 8px; color: var(--text-soft)">
                            <Icon name="map-pin" :size="13" /> {{ s.market }}
                        </div>
                        <div v-if="s.address" style="display: flex; align-items: center; gap: 8px; color: var(--text-muted); font-size: 12px;">
                            <Icon name="home" :size="13" /> {{ s.address }}
                        </div>
                        <div v-if="s.rating" style="display: flex; align-items: center; gap: 4px; margin-top: 4px;">
                            <Icon v-for="i in 5" :key="i" name="star" :size="13"
                                  :style="i <= Math.round(s.rating) ? 'fill: var(--yellow); color: var(--yellow)' : 'color: var(--border-strong)'" />
                            <span style="font-size: 12px; color: var(--text-muted); margin-left: 4px;">{{ s.rating }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Form modal -->
            <AppModal :show="formShow" :title="form.id ? 'Таҳрири фурушанда' : 'Фурушандаи нав'"
                      size="lg" @close="formShow = false">
                <div class="form-grid">
                    <div class="form-group full">
                        <label class="form-label">Номи фурушанда <span class="req">*</span></label>
                        <input v-model="form.name" class="form-input" placeholder="Ном ва насаб" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Ширкат / Бизнес</label>
                        <input v-model="form.company" class="form-input" placeholder="Масалан: ООО Стройбаза" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Бозор</label>
                        <input v-model="form.market" class="form-input" placeholder="Масалан: Бозори Корвон" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Телефон</label>
                        <input v-model="form.phone" class="form-input" placeholder="+992 901 23 45 67" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Телефони иловагӣ</label>
                        <input v-model="form.phone2" class="form-input" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input v-model="form.email" type="email" class="form-input" placeholder="email@example.com" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Рейтинг (0-5)</label>
                        <input v-model.number="form.rating" type="number" min="0" max="5" step="0.1" class="form-input" />
                    </div>
                    <div class="form-group full">
                        <label class="form-label">Суроға</label>
                        <input v-model="form.address" class="form-input" placeholder="Шаҳр, кӯча..." />
                    </div>
                    <div class="form-group full">
                        <label class="form-label">Эзоҳ</label>
                        <textarea v-model="form.notes" class="form-textarea"
                                  placeholder="Чӣ маҳсулот мефурӯшад, шартҳо, малумоти иловагӣ..."></textarea>
                    </div>
                </div>
                <template #footer>
                    <button class="btn btn-ghost" @click="formShow = false">Бекор</button>
                    <button class="btn btn-primary" @click="save" :disabled="!form.name?.trim()">
                        <Icon name="check" :size="14" /> Захира
                    </button>
                </template>
            </AppModal>

            <!-- Detail modal -->
            <AppModal :show="detailShow" :title="detail?.name || ''" size="lg" @close="detailShow = false">
                <div v-if="detail">
                    <div class="form-grid" style="margin-bottom: 16px;">
                        <div class="form-group">
                            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .08em;">Ширкат</div>
                            <div style="font-weight: 600">{{ detail.company || '—' }}</div>
                        </div>
                        <div class="form-group">
                            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .08em;">Бозор</div>
                            <div style="font-weight: 600">{{ detail.market || '—' }}</div>
                        </div>
                        <div class="form-group">
                            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .08em;">Телефон</div>
                            <div style="font-weight: 600">{{ detail.phone || '—' }}</div>
                        </div>
                        <div class="form-group">
                            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .08em;">Email</div>
                            <div style="font-weight: 600">{{ detail.email || '—' }}</div>
                        </div>
                        <div class="form-group full">
                            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .08em;">Суроға</div>
                            <div style="font-weight: 600">{{ detail.address || '—' }}</div>
                        </div>
                        <div v-if="detail.notes" class="form-group full">
                            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .08em;">Эзоҳ</div>
                            <div>{{ detail.notes }}</div>
                        </div>
                    </div>

                    <h4 style="margin: 20px 0 10px; font-size: 14px;">
                        Маҳсулоти ин фурушанда ({{ detail.products?.length || 0 }})
                    </h4>
                    <div v-if="detail.products?.length" class="table-wrap">
                        <table class="data">
                            <thead>
                                <tr>
                                    <th>Ном</th>
                                    <th>Категория</th>
                                    <th>Нархи фурӯш</th>
                                    <th>Захира</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="p in detail.products" :key="p.id">
                                    <td><strong>{{ p.name }}</strong></td>
                                    <td>{{ p.category_name }}</td>
                                    <td>{{ fmtMoney(p.price, p.currency) }}</td>
                                    <td>{{ p.stock }} {{ p.unit }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <AppEmpty v-else icon="package" title="Маҳсулот нест"
                              text="Аз ин фурушанда то ҳол маҳсулот илова нашудааст" />
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
        const suppliers = Vue.ref([]);
        const loading = Vue.ref(false);
        const q = Vue.ref('');

        const formShow = Vue.ref(false);
        const form = Vue.reactive({
            id: null, name: '', company: '', phone: '', phone2: '',
            email: '', market: '', address: '', notes: '', photo: '', rating: 0,
        });

        const detailShow = Vue.ref(false);
        const detail = Vue.ref(null);

        const confirm = Vue.reactive({ show: false, title: '', text: '', confirmText: '', action: null });

        const filtered = Vue.computed(() => {
            const s = q.value.trim().toLowerCase();
            if (!s) return suppliers.value;
            return suppliers.value.filter(x => {
                const hay = (x.name + ' ' + (x.company || '') + ' ' + (x.phone || '') + ' ' + (x.market || '')).toLowerCase();
                return hay.includes(s);
            });
        });

        async function load() {
            loading.value = true;
            try { suppliers.value = await window.API.suppliers.list(); }
            catch (e) { window.toast.error(e.message); }
            finally { loading.value = false; }
        }

        function openModal(s) {
            if (s) {
                Object.assign(form, {
                    id: s.id, name: s.name, company: s.company,
                    phone: s.phone, phone2: s.phone2, email: s.email,
                    market: s.market, address: s.address, notes: s.notes,
                    photo: s.photo, rating: s.rating,
                });
            } else {
                Object.assign(form, {
                    id: null, name: '', company: '', phone: '', phone2: '',
                    email: '', market: '', address: '', notes: '', photo: '', rating: 0,
                });
            }
            formShow.value = true;
        }

        async function save() {
            try {
                if (form.id) {
                    await window.API.suppliers.update(form.id, form);
                    window.toast.success('Фурушанда навсозӣ шуд');
                } else {
                    await window.API.suppliers.create(form);
                    window.toast.success('Фурушанда илова шуд');
                }
                formShow.value = false;
                window.EventBus?.emit('data:suppliers'); await load();
            } catch (e) { window.toast.error(e.message); }
        }

        async function viewDetail(s) {
            try {
                detail.value = await window.API.suppliers.get(s.id);
                detailShow.value = true;
            } catch (e) { window.toast.error(e.message); }
        }

        function askDelete(s) {
            Object.assign(confirm, {
                show: true,
                title: 'Нест кардани фурушанда',
                text: `Шумо мутмаин ҳастед, ки "${s.name}"-ро нест мекунед?`,
                confirmText: 'Нест кардан',
                action: async () => {
                    try {
                        await window.API.suppliers.remove(s.id);
                        window.toast.success('Фурушанда нест шуд');
                        confirm.show = false;
                        window.EventBus?.emit('data:suppliers'); await load();
                    } catch (e) { window.toast.error(e.message); }
                },
            });
        }

        const _evtCleanup = [];
        Vue.onMounted(() => {
            load();
            ['data:suppliers', 'data:products'].forEach(ev => {
                const off = window.EventBus?.on(ev, load);
                if (off) _evtCleanup.push(off);
            });
        });
        Vue.onUnmounted(() => { _evtCleanup.forEach(fn => fn()); });

        return {
            suppliers, filtered, loading, q,
            formShow, form,
            detailShow, detail,
            confirm,
            openModal, save, viewDetail, askDelete,
            fmtMoney: window.fmtMoney,
        };
    },
};
