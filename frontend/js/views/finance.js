/* Finance view — даромад, харҷ, фоидаи соф, чарт, экспорт */
window.AppViews = window.AppViews || {};

const EXPENSE_CATS = [
    { value: 'rent', label: 'Иҷора' },
    { value: 'salary', label: 'Маошҳо' },
    { value: 'utilities', label: 'Коммуналӣ' },
    { value: 'transport', label: 'Нақлиёт' },
    { value: 'tax', label: 'Андоз' },
    { value: 'marketing', label: 'Реклама' },
    { value: 'goods', label: 'Хариди мол' },
    { value: 'other', label: 'Дигар' },
];

window.AppViews.Finance = {
    name: 'FinanceView',
    template: `
        <div>
            <div class="page-header">
                <div>
                    <h1>Молия</h1>
                    <p>Даромад, харҷ ва фоидаи соф</p>
                </div>
                <div class="page-actions">
                    <select v-model="period" @change="load" class="form-select" style="max-width: 180px">
                        <option value="all">Ҳамаи давра</option>
                        <option value="year">Соли охир</option>
                        <option value="month">30 рӯзи охир</option>
                        <option value="week">7 рӯзи охир</option>
                        <option value="today">Имрӯз</option>
                    </select>
                    <button class="btn btn-secondary" @click="exportXlsx">
                        <Icon name="download" :size="16" /> Excel
                    </button>
                    <button class="btn btn-primary" @click="openExpense()">
                        <Icon name="plus" :size="16" /> Харҷи нав
                    </button>
                </div>
            </div>

            <div v-if="loading && !stats" class="empty">
                <div class="loader-spinner" style="width: 32px; height: 32px;"></div>
            </div>

            <template v-if="stats">
                <!-- KPI cards -->
                <div class="stats-grid">
                    <div class="stat-card highlight">
                        <button class="stat-arrow"><Icon name="trending-up" :size="14" /></button>
                        <div class="stat-label">Даромад (фурӯш)</div>
                        <div class="stat-value">{{ fmtMoney(stats.revenue) }}</div>
                        <div class="stat-trend">
                            <Icon name="check" :size="12" /> {{ stats.orders_count }} заявка
                        </div>
                    </div>
                    <div class="stat-card" style="background: #fff7ed; border-color: #fed7aa;">
                        <button class="stat-arrow" style="background: white;">
                            <Icon name="package" :size="14" />
                        </button>
                        <div class="stat-label">Маблағи хариди мол</div>
                        <div class="stat-value" style="color: #c2410c">{{ fmtMoney(stats.cost_of_goods) }}</div>
                        <div class="stat-trend">
                            <Icon name="info" :size="12" /> Cost of goods
                        </div>
                    </div>
                    <div class="stat-card" style="background: #fee2e2; border-color: #fecaca;">
                        <button class="stat-arrow" style="background: white;">
                            <Icon name="trending-down" :size="14" />
                        </button>
                        <div class="stat-label">Харҷҳои мудирӣ</div>
                        <div class="stat-value" style="color: #b91c1c">{{ fmtMoney(stats.expenses_total) }}</div>
                        <div class="stat-trend">
                            <Icon name="info" :size="12" /> Иҷора, маош, ва ғайра
                        </div>
                    </div>
                    <div class="stat-card" :class="{ 'highlight': stats.net_profit >= 0 }"
                         :style="stats.net_profit < 0 ? 'background: #fee2e2; border-color: #fecaca;' : ''">
                        <button class="stat-arrow"
                                :style="stats.net_profit < 0 ? 'background: white;' : ''">
                            <Icon name="coins" :size="14" />
                        </button>
                        <div class="stat-label">Фоидаи соф</div>
                        <div class="stat-value" :style="stats.net_profit < 0 ? 'color: #b91c1c' : ''">
                            {{ fmtMoney(stats.net_profit) }}
                        </div>
                        <div class="stat-trend">
                            <Icon name="info" :size="12" /> Маржа: {{ stats.margin_percent.toFixed(1) }}%
                        </div>
                    </div>
                </div>

                <!-- Inventory + chart row -->
                <div class="section-row" style="grid-template-columns: 2fr 1fr;">
                    <!-- Monthly chart -->
                    <div class="card">
                        <div class="section-title">
                            <h3>Даромад ва фоида (12 моҳи охир)</h3>
                            <span class="link">{{ fmtMoney(yearTotal) }}</span>
                        </div>
                        <div class="finance-chart">
                            <div v-for="(m, idx) in stats.monthly" :key="idx" class="finance-month">
                                <div class="finance-bars">
                                    <div class="finance-bar finance-bar-rev"
                                         :style="{ height: barH(m.revenue) + '%' }"
                                         :title="'Даромад: ' + fmtMoney(m.revenue)"></div>
                                    <div class="finance-bar finance-bar-profit"
                                         :class="{ 'is-loss': m.profit < 0 }"
                                         :style="{ height: barH(Math.abs(m.profit)) + '%' }"
                                         :title="(m.profit >= 0 ? 'Фоида: ' : 'Зиён: ') + fmtMoney(Math.abs(m.profit))"></div>
                                </div>
                                <div class="finance-month-label">{{ m.label }}</div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 16px; justify-content: center; margin-top: 12px; font-size: 12px;">
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <span style="width: 10px; height: 10px; border-radius: 2px; background: var(--green-600);"></span>
                                Даромад
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <span style="width: 10px; height: 10px; border-radius: 2px; background: var(--blue);"></span>
                                Фоидаи соф
                            </div>
                        </div>
                    </div>

                    <!-- Inventory + expenses by category -->
                    <div class="card">
                        <div class="section-title"><h3>Захираи ҷорӣ</h3></div>
                        <div style="margin-bottom: 16px;">
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border);">
                                <span style="color: var(--text-muted); font-size: 12px;">Бо нархи фурӯш</span>
                                <strong style="color: var(--green-700)">{{ fmtMoney(stats.inventory_value_sell) }}</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border);">
                                <span style="color: var(--text-muted); font-size: 12px;">Бо нархи харид</span>
                                <strong>{{ fmtMoney(stats.inventory_value_cost) }}</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                                <span style="color: var(--text-muted); font-size: 12px;">Эҳтимолан фоида</span>
                                <strong style="color: var(--green-700)">
                                    {{ fmtMoney(stats.inventory_value_sell - stats.inventory_value_cost) }}
                                </strong>
                            </div>
                        </div>

                        <div class="section-title" style="margin-top: 18px;">
                            <h3 style="font-size: 14px;">Харҷ бо категорияҳо</h3>
                        </div>
                        <div v-if="stats.expenses_by_category.length">
                            <div v-for="(c, idx) in stats.expenses_by_category" :key="idx"
                                 style="margin-bottom: 8px;">
                                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                                    <span>{{ catLabel(c.category) }}</span>
                                    <strong>{{ fmtMoney(c.total) }}</strong>
                                </div>
                                <div style="height: 6px; background: var(--bg); border-radius: 3px; overflow: hidden;">
                                    <div :style="{ width: catPct(c.total) + '%', background: catColor(idx), height: '100%' }"></div>
                                </div>
                            </div>
                        </div>
                        <p v-else style="color: var(--text-muted); font-size: 12px; text-align: center; padding: 14px 0;">
                            Ҳоло харҷҳо нест
                        </p>
                    </div>
                </div>

                <!-- Expenses table -->
                <div class="card" style="margin-top: 14px;">
                    <div class="section-title">
                        <h3>Харҷҳо ({{ expenses.length }})</h3>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-sm btn-ghost" @click="exportExpenses">
                                <Icon name="download" :size="13" /> Excel
                            </button>
                            <button class="btn btn-sm btn-primary" @click="openExpense()">
                                <Icon name="plus" :size="13" /> Илова
                            </button>
                        </div>
                    </div>
                    <AppEmpty v-if="!expenses.length"
                              icon="file-text"
                              title="Харҷ нест"
                              text="Илова кардани харҷи аввалин барои пайгирии хароҷот" />
                    <div v-else class="table-wrap">
                        <table class="data">
                            <thead>
                                <tr>
                                    <th>Ном</th>
                                    <th>Категория</th>
                                    <th>Сана</th>
                                    <th>Маблағ</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="e in expenses" :key="e.id">
                                    <td>
                                        <strong>{{ e.title }}</strong>
                                        <div v-if="e.notes" style="font-size: 11px; color: var(--text-muted)">{{ e.notes }}</div>
                                    </td>
                                    <td><span class="pill pill-gray">{{ catLabel(e.category) }}</span></td>
                                    <td>{{ fmtDate(e.expense_date) }}</td>
                                    <td><strong style="color: #b91c1c">−{{ fmtMoney(e.amount, e.currency) }}</strong></td>
                                    <td>
                                        <div class="row-actions">
                                            <button class="btn-icon btn btn-ghost" @click="openExpense(e)">
                                                <Icon name="edit" :size="14" />
                                            </button>
                                            <button class="btn-icon btn btn-ghost" @click="askDelete(e)">
                                                <Icon name="trash" :size="14" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </template>

            <!-- Expense modal -->
            <AppModal :show="formShow"
                      :title="expForm.id ? 'Таҳрири харҷ' : 'Харҷи нав'"
                      @close="formShow = false">
                <div class="form-grid">
                    <div class="form-group full">
                        <label class="form-label">Ном <span class="req">*</span></label>
                        <input v-model="expForm.title" class="form-input" placeholder="Масалан: Иҷораи дӯкон" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Категория</label>
                        <select v-model="expForm.category" class="form-select">
                            <option v-for="c in expenseCats" :key="c.value" :value="c.value">{{ c.label }}</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Сана</label>
                        <input v-model="expForm.expense_date" type="date" class="form-input" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Маблағ <span class="req">*</span></label>
                        <input v-model.number="expForm.amount" type="number" min="0" step="0.01" class="form-input" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Валюта</label>
                        <select v-model="expForm.currency" class="form-select">
                            <option value="TJS">TJS</option>
                            <option value="USD">USD</option>
                            <option value="RUB">RUB</option>
                        </select>
                    </div>
                    <div class="form-group full">
                        <label class="form-label">Эзоҳ</label>
                        <textarea v-model="expForm.notes" class="form-textarea"></textarea>
                    </div>
                </div>
                <template #footer>
                    <button class="btn btn-ghost" @click="formShow = false">Бекор</button>
                    <button class="btn btn-primary" @click="saveExpense"
                            :disabled="!expForm.title?.trim()">
                        <Icon name="check" :size="14" /> Захира
                    </button>
                </template>
            </AppModal>

            <AppConfirm :show="confirm.show" :title="confirm.title" :text="confirm.text"
                        confirm-text="Нест кардан" :danger="true"
                        @close="confirm.show = false"
                        @confirm="confirm.action && confirm.action()" />
        </div>
    `,
    setup() {
        const stats = Vue.ref(null);
        const expenses = Vue.ref([]);
        const loading = Vue.ref(false);
        const period = Vue.ref('all');
        const formShow = Vue.ref(false);
        const expForm = Vue.reactive({
            id: null, title: '', category: 'other', amount: 0,
            currency: 'TJS', notes: '',
            expense_date: new Date().toISOString().slice(0, 10),
        });
        const confirm = Vue.reactive({ show: false, title: '', text: '', action: null });
        const expenseCats = EXPENSE_CATS;

        const yearTotal = Vue.computed(() => {
            if (!stats.value) return 0;
            return (stats.value.monthly || []).reduce((s, m) => s + m.revenue, 0);
        });

        async function load() {
            loading.value = true;
            try {
                const [s, e] = await Promise.all([
                    window.API.finance(period.value),
                    window.API.expenses.list(),
                ]);
                stats.value = s;
                expenses.value = e;
            } catch (err) {
                window.toast?.error(err.message);
            } finally {
                loading.value = false;
            }
        }

        function barH(val) {
            if (!stats.value) return 0;
            const max = Math.max(
                ...(stats.value.monthly || []).map(m => Math.max(m.revenue, Math.abs(m.profit))),
                1,
            );
            return Math.min(98, (val / max) * 95) + 2;
        }

        function catLabel(c) {
            return EXPENSE_CATS.find(x => x.value === c)?.label || c;
        }

        function catColor(idx) {
            const colors = ['#16a34a', '#0ea5e9', '#f97316', '#a855f7',
                            '#eab308', '#06b6d4', '#ec4899', '#64748b'];
            return colors[idx % colors.length];
        }

        function catPct(total) {
            const max = Math.max(...(stats.value?.expenses_by_category || []).map(c => c.total), 1);
            return Math.min(100, (total / max) * 100);
        }

        function openExpense(e) {
            if (e) {
                Object.assign(expForm, {
                    id: e.id, title: e.title, category: e.category,
                    amount: e.amount, currency: e.currency, notes: e.notes,
                    expense_date: e.expense_date || new Date().toISOString().slice(0, 10),
                });
            } else {
                Object.assign(expForm, {
                    id: null, title: '', category: 'other', amount: 0,
                    currency: 'TJS', notes: '',
                    expense_date: new Date().toISOString().slice(0, 10),
                });
            }
            formShow.value = true;
        }

        async function saveExpense() {
            try {
                if (expForm.id) {
                    await window.API.expenses.update(expForm.id, expForm);
                    window.toast?.success('Харҷ навсозӣ шуд');
                } else {
                    await window.API.expenses.create(expForm);
                    window.toast?.success('Харҷ илова шуд');
                }
                formShow.value = false;
                window.EventBus?.emit('data:expenses');
                window.EventBus?.emit('data:finance');
                await load();
            } catch (e) {
                window.toast?.error(e.message);
            }
        }

        function askDelete(e) {
            Object.assign(confirm, {
                show: true,
                title: 'Нест кардани харҷ',
                text: `"${e.title}" — ${window.fmtMoney(e.amount)}`,
                action: async () => {
                    try {
                        await window.API.expenses.remove(e.id);
                        window.toast?.success('Нест шуд');
                        confirm.show = false;
                        window.EventBus?.emit('data:expenses');
                        window.EventBus?.emit('data:finance');
                        await load();
                    } catch (err) {
                        window.toast?.error(err.message);
                    }
                },
            });
        }

        function exportXlsx() {
            window.API.export('finance', 'xlsx').catch(e =>
                window.toast?.error(e.message));
        }

        function exportExpenses() {
            window.API.export('expenses', 'xlsx').catch(e =>
                window.toast?.error(e.message));
        }

        let off1, off2, off3;
        Vue.onMounted(() => {
            load();
            // Реактивият — обнавление вақте маълумот тағйир ёбад
            off1 = window.EventBus?.on('data:orders', load);
            off2 = window.EventBus?.on('data:expenses', load);
            off3 = window.EventBus?.on('data:products', load);
        });
        Vue.onUnmounted(() => {
            off1 && off1(); off2 && off2(); off3 && off3();
        });

        return {
            stats, expenses, loading, period,
            formShow, expForm, confirm, expenseCats,
            yearTotal,
            load, barH, catLabel, catColor, catPct,
            openExpense, saveExpense, askDelete,
            exportXlsx, exportExpenses,
            fmtMoney: window.fmtMoney, fmtDate: window.fmtDate,
        };
    },
};
