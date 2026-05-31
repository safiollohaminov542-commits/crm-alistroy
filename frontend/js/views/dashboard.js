/* Dashboard view — асосии барномаи Donezo-style */
window.AppViews = window.AppViews || {};

window.AppViews.Dashboard = {
    name: 'DashboardView',
    template: `
        <div>
            <div class="page-header">
                <div>
                    <h1>Дашборд</h1>
                    <p>Маълумоти умумии склад ва савдо дар як ҷой</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-secondary" @click="reload">
                        <Icon name="refresh" :size="16" /> Навсозӣ
                    </button>
                    <button class="btn btn-primary" @click="goTo('orders')">
                        <Icon name="plus" :size="16" /> Заявкаи нав
                    </button>
                </div>
            </div>

            <div v-if="loading" class="empty">
                <div class="loader-spinner" style="width: 32px; height: 32px;"></div>
            </div>

            <template v-else-if="stats">
                <!-- Stat cards -->
                <div class="stats-grid">
                    <div class="stat-card highlight">
                        <button class="stat-arrow" @click="goTo('products')">
                            <Icon name="arrow-up-right" :size="14" />
                        </button>
                        <div class="stat-label">Маҳсулоти умумӣ</div>
                        <div class="stat-value">{{ stats.total_products }}</div>
                        <div class="stat-trend">
                            <Icon name="trending-up" :size="12" /> Дар склад
                        </div>
                    </div>
                    <div class="stat-card">
                        <button class="stat-arrow" @click="goTo('orders')">
                            <Icon name="arrow-up-right" :size="14" />
                        </button>
                        <div class="stat-label">Заявкаҳои анҷомшуда</div>
                        <div class="stat-value">{{ stats.orders.completed }}</div>
                        <div class="stat-trend">
                            <Icon name="check" :size="12" /> Аз {{ stats.orders.total }} ҳама
                        </div>
                    </div>
                    <div class="stat-card">
                        <button class="stat-arrow" @click="goTo('orders')">
                            <Icon name="arrow-up-right" :size="14" />
                        </button>
                        <div class="stat-label">Дар ҳол</div>
                        <div class="stat-value">{{ stats.orders.in_progress }}</div>
                        <div class="stat-trend">
                            <Icon name="clock" :size="12" /> Иҷро шуда истода
                        </div>
                    </div>
                    <div class="stat-card">
                        <button class="stat-arrow" @click="goTo('orders')">
                            <Icon name="arrow-up-right" :size="14" />
                        </button>
                        <div class="stat-label">Заявкаи нав</div>
                        <div class="stat-value">{{ stats.orders.new }}</div>
                        <div class="stat-trend">
                            <Icon name="info" :size="12" /> Талаб ба коркард
                        </div>
                    </div>
                </div>

                <!-- Big stats row: chart + reminder + recent products -->
                <div class="section-row">
                    <!-- Chart -->
                    <div class="card">
                        <div class="section-title">
                            <h3>Фурӯш дар 7 рӯзи охир</h3>
                            <span class="link">{{ fmtMoney(weekTotal) }}</span>
                        </div>
                        <div class="chart-bars">
                            <div v-for="(d, idx) in stats.chart_7days" :key="idx"
                                 class="chart-bar"
                                 :class="{ tallest: idx === maxDayIdx && d.total > 0 }">
                                <div class="chart-bar-track">
                                    <div v-if="d.total > 0 && idx === maxDayIdx" class="chart-bar-value">
                                        {{ formatShort(d.total) }}
                                    </div>
                                    <div class="chart-bar-fill"
                                         :style="{ height: barHeight(d.total) + '%' }"></div>
                                </div>
                                <div class="chart-bar-label">{{ d.label }}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Reminder / Pending -->
                    <div class="card reminder-card" style="background: var(--green-50); border-color: var(--green-200);">
                        <div class="section-title">
                            <h3>Ёдоварӣ</h3>
                        </div>
                        <div v-if="stats.low_stock?.length">
                            <div style="font-size: 12px; color: var(--green-800); font-weight: 600; margin-bottom: 6px;">
                                ЗАХИРАИ КАМ
                            </div>
                            <div class="reminder-text">
                                {{ stats.low_stock[0].name }}
                            </div>
                            <div class="reminder-time">
                                Боқимонда: {{ stats.low_stock[0].stock }} {{ stats.low_stock[0].unit }}
                                · Минимум: {{ stats.low_stock[0].min_stock }}
                            </div>
                            <button class="print-btn" @click="goTo('products', { low_stock: '1' })">
                                <Icon name="package" :size="14" /> Ҳамаи захираҳои кам
                            </button>
                        </div>
                        <div v-else style="padding: 30px 0; text-align: center; color: var(--text-muted);">
                            <Icon name="check-circle" :size="40" style="color: var(--green-500); margin-bottom: 10px;" />
                            <p style="margin: 0; font-weight: 600;">Захира хуб аст!</p>
                            <p style="margin: 4px 0 0; font-size: 12px;">Ягон маҳсулот кам набудааст</p>
                        </div>
                    </div>

                    <!-- Recent products / Project list -->
                    <div class="card">
                        <div class="section-title">
                            <h3>Маҳсулоти охирин</h3>
                            <a class="link" @click="goTo('products')">+ Илова</a>
                        </div>
                        <div class="list">
                            <div v-for="p in stats.recent_products?.slice(0, 6)" :key="p.id" class="list-item">
                                <div class="item-icon">
                                    <Icon name="package" :size="16" />
                                </div>
                                <div class="item-meta">
                                    <div class="item-title">{{ p.name }}</div>
                                    <div class="item-sub">{{ p.subcategory_name }} · {{ fmtDate(p.created_at) }}</div>
                                </div>
                                <div style="text-align: left; font-size: 12px;">
                                    <strong style="color: var(--green-700)">{{ fmtMoney(p.price) }}</strong>
                                </div>
                            </div>
                            <AppEmpty v-if="!stats.recent_products?.length"
                                      icon="package" title="Маҳсулот нест" />
                        </div>
                    </div>
                </div>

                <!-- Bottom row: clients + project progress + time tracker -->
                <div class="section-row">
                    <!-- Recent orders -->
                    <div class="card">
                        <div class="section-title">
                            <h3>Заявкаҳои охирин</h3>
                            <a class="link" @click="goTo('orders')">Ҳама</a>
                        </div>
                        <div class="list">
                            <div v-for="o in stats.recent_orders?.slice(0, 5)" :key="o.id" class="list-item">
                                <div class="item-icon" :style="orderIconStyle(o.status)">
                                    <Icon name="shopping-cart" :size="16" />
                                </div>
                                <div class="item-meta">
                                    <div class="item-title">{{ o.client_name }}</div>
                                    <div class="item-sub">{{ o.order_number }} · {{ fmtDate(o.created_at) }}</div>
                                </div>
                                <div style="text-align: left; min-width: 80px;">
                                    <span :class="['pill', statusPill(o.status)]">{{ statusLabel(o.status) }}</span>
                                    <div style="font-size: 12px; font-weight: 700; margin-top: 4px; color: var(--green-700)">
                                        {{ fmtMoney(o.total) }}
                                    </div>
                                </div>
                            </div>
                            <AppEmpty v-if="!stats.recent_orders?.length"
                                      icon="shopping-cart" title="Заявка нест" />
                        </div>
                    </div>

                    <!-- Progress (donut) -->
                    <div class="card" style="text-align: center;">
                        <div class="section-title">
                            <h3>Прогресси заявкаҳо</h3>
                        </div>
                        <div style="position: relative; width: 180px; height: 180px; margin: 12px auto 0;">
                            <svg width="180" height="180" viewBox="0 0 180 180">
                                <circle cx="90" cy="90" r="74"
                                    stroke-width="14" stroke="#f3f4f6" fill="none"
                                    stroke-dasharray="2 6" />
                                <circle cx="90" cy="90" r="74"
                                    stroke-width="14"
                                    :stroke="completedRatio >= 0.7 ? '#16a34a' : completedRatio >= 0.4 ? '#22c55e' : '#86efac'"
                                    fill="none"
                                    stroke-linecap="round"
                                    transform="rotate(-90 90 90)"
                                    :stroke-dasharray="(completedRatio * 464) + ' 464'" />
                            </svg>
                            <div style="position: absolute; inset: 0; display: flex; flex-direction: column;
                                        align-items: center; justify-content: center;">
                                <div style="font-size: 36px; font-weight: 800;">
                                    {{ Math.round(completedRatio * 100) }}%
                                </div>
                                <div style="font-size: 11px; color: var(--text-muted);">Иҷро шуда</div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 14px; justify-content: center; margin-top: 16px; font-size: 12px;">
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <span style="width: 8px; height: 8px; background: var(--green-600); border-radius: 50%;"></span>
                                Анҷом ({{ stats.orders.completed }})
                            </div>
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <span style="width: 8px; height: 8px; background: var(--orange); border-radius: 50%;"></span>
                                Дар ҳол ({{ stats.orders.in_progress }})
                            </div>
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <span style="width: 8px; height: 8px; background: #cbd5e1; border-radius: 50%;"></span>
                                Дигар
                            </div>
                        </div>
                    </div>

                    <!-- Inventory + revenue summary (Time Tracker analog) -->
                    <div class="card" style="background: linear-gradient(135deg, #14532d 0%, #166534 100%);
                                              color: white; position: relative; overflow: hidden;">
                        <div style="position: absolute; right: -40px; bottom: -40px; width: 200px; height: 200px;
                                    background: radial-gradient(circle, rgba(34,197,94,.4) 0%, transparent 70%);"></div>
                        <div class="section-title" style="position: relative;">
                            <h3 style="color: white;">Хазина</h3>
                        </div>
                        <div style="position: relative;">
                            <div style="font-size: 12px; color: rgba(255,255,255,.7); font-weight: 600; margin-bottom: 4px;">
                                ДАРОМАД (АНҶОМ ШУДА)
                            </div>
                            <div style="font-size: 32px; font-weight: 800; font-feature-settings: 'tnum';">
                                {{ fmtMoney(stats.revenue) }}
                            </div>
                            <div style="border-top: 1px solid rgba(255,255,255,.2); margin: 16px 0; padding-top: 12px;">
                                <div style="font-size: 11px; color: rgba(255,255,255,.7); margin-bottom: 4px;">
                                    АРЗИШИ СКЛАД
                                </div>
                                <div style="font-size: 20px; font-weight: 700;">
                                    {{ fmtMoney(stats.inventory_value) }}
                                </div>
                            </div>
                            <div style="display: flex; gap: 8px; margin-top: 14px;">
                                <button class="btn btn-sm" style="background: white; color: var(--green-700); border: none; flex: 1;"
                                        @click="goTo('clients')">
                                    <Icon name="users" :size="13" /> Клиентҳо ({{ stats.total_clients }})
                                </button>
                                <button class="btn btn-sm" style="background: rgba(255,255,255,.18); color: white; border: 1px solid rgba(255,255,255,.3); flex: 1;"
                                        @click="goTo('suppliers')">
                                    <Icon name="truck" :size="13" /> Фурушанда ({{ stats.total_suppliers }})
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </div>
    `,
    setup() {
        const stats = Vue.ref(null);
        const loading = Vue.ref(false);
        const app = Vue.inject('app');

        const weekTotal = Vue.computed(() => {
            if (!stats.value) return 0;
            return (stats.value.chart_7days || []).reduce((s, d) => s + d.total, 0);
        });

        const maxDayIdx = Vue.computed(() => {
            if (!stats.value) return -1;
            let max = 0, idx = -1;
            (stats.value.chart_7days || []).forEach((d, i) => {
                if (d.total > max) { max = d.total; idx = i; }
            });
            return idx;
        });

        const completedRatio = Vue.computed(() => {
            const o = stats.value?.orders;
            if (!o || !o.total) return 0;
            return o.completed / o.total;
        });

        function barHeight(val) {
            if (!stats.value) return 0;
            const max = Math.max(...(stats.value.chart_7days || []).map(d => d.total), 1);
            return Math.min(95, (val / max) * 95) + 5; // 5% мин
        }

        function formatShort(n) {
            if (n >= 1000) return (n / 1000).toFixed(1) + 'к';
            return Math.round(n);
        }

        function orderIconStyle(status) {
            const colors = {
                'completed': 'background: var(--green-100); color: var(--green-700);',
                'in_progress': 'background: #ffedd5; color: var(--orange);',
                'new': 'background: #dbeafe; color: #1d4ed8;',
                'cancelled': 'background: #fee2e2; color: var(--red);',
            };
            return colors[status] || colors['new'];
        }

        async function load() {
            loading.value = true;
            try { stats.value = await window.API.dashboard(); }
            catch (e) { window.toast.error(e.message); }
            finally { loading.value = false; }
        }

        function reload() { load(); window.toast.success('Маълумот навсозӣ шуд'); }

        function goTo(view, params) { app && app.navigate(view, params); }

        Vue.onMounted(load);

        return {
            stats, loading, weekTotal, maxDayIdx, completedRatio,
            barHeight, formatShort, orderIconStyle,
            reload, goTo,
            fmtMoney: window.fmtMoney, fmtDate: window.fmtDate,
            statusLabel: window.statusLabel, statusPill: window.statusPill,
        };
    },
};
