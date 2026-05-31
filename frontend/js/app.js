/* AliStroy CRM — main Vue app */

const NAV_ITEMS = [
    { id: 'dashboard', label: 'Дашборд', icon: 'dashboard', section: 'main' },
    { id: 'mindmap', label: 'Доскаи калон', icon: 'grid', section: 'main' },
    { id: 'categories', label: 'Категорияҳо', icon: 'folder', section: 'main' },
    { id: 'products', label: 'Маҳсулот', icon: 'package', section: 'main' },
    { id: 'suppliers', label: 'Фурушандагон', icon: 'truck', section: 'main' },
    { id: 'clients', label: 'Клиентҳо', icon: 'users', section: 'main' },
    { id: 'orders', label: 'Заявкаҳо', icon: 'shopping-cart', section: 'main' },
];

const VIEW_MAP = {
    dashboard: window.AppViews.Dashboard,
    mindmap: window.AppViews.MindMap,
    categories: window.AppViews.Categories,
    products: window.AppViews.Products,
    suppliers: window.AppViews.Suppliers,
    clients: window.AppViews.Clients,
    orders: window.AppViews.Orders,
};

const App = {
    name: 'App',
    template: `
        <div class="app-shell">
            <!-- Sidebar backdrop on mobile -->
            <div v-if="sidebarOpen" class="sidebar-backdrop" @click="sidebarOpen = false"></div>

            <!-- Sidebar -->
            <aside class="sidebar" :class="{ open: sidebarOpen }">
                <div class="sidebar-logo">
                    <div class="logo-mark">
                        <Icon name="home" :size="20" />
                    </div>
                    <span>AliStroy</span>
                </div>

                <div class="sidebar-section-title">Меню</div>
                <ul class="sidebar-nav">
                    <li v-for="item in mainNav" :key="item.id">
                        <button class="sidebar-link"
                                :class="{ active: currentView === item.id }"
                                @click="navigate(item.id)">
                            <Icon :name="item.icon" :size="18" />
                            <span>{{ item.label }}</span>
                            <span v-if="item.id === 'orders' && newOrdersCount > 0" class="badge">
                                {{ newOrdersCount }}+
                            </span>
                        </button>
                    </li>
                </ul>

                <div class="sidebar-section-title">Умумӣ</div>
                <ul class="sidebar-nav">
                    <li>
                        <button class="sidebar-link" @click="aboutShow = true">
                            <Icon name="info" :size="18" />
                            <span>Дар бораи</span>
                        </button>
                    </li>
                    <li>
                        <button class="sidebar-link" @click="window.toast?.info('Танзимот ба зудӣ')">
                            <Icon name="settings" :size="18" />
                            <span>Танзимот</span>
                        </button>
                    </li>
                </ul>

                <div class="sidebar-promo">
                    <h4>Ҳамаи маълумот</h4>
                    <p>Дар як ҷо. Дар вақти зарурӣ.</p>
                    <button @click="navigate('mindmap')">
                        Кушодани харита →
                    </button>
                </div>
            </aside>

            <!-- Main area -->
            <main class="main">
                <!-- Topbar -->
                <header class="topbar">
                    <button class="mobile-menu-btn" @click="sidebarOpen = !sidebarOpen">
                        <Icon name="menu" :size="20" />
                    </button>

                    <div class="search-wrap">
                        <Icon name="search" :size="16" />
                        <input v-model="globalSearch" type="text"
                               placeholder="Ҷустуҷӯ дар тамоми CRM..."
                               @focus="searchFocused = true"
                               @blur="onSearchBlur"
                               @input="onGlobalSearch" />
                        <span class="search-kbd">⌘K</span>

                        <!-- Search dropdown -->
                        <div v-if="searchFocused && globalSearch.trim() && searchResults"
                             style="position: absolute; top: 110%; left: 0; right: 0; background: white;
                                    border: 1px solid var(--border); border-radius: 14px;
                                    box-shadow: var(--shadow-lg); max-height: 480px; overflow-y: auto; z-index: 100;
                                    padding: 10px;">
                            <div v-if="!hasResults" style="padding: 20px; text-align: center; color: var(--text-muted);">
                                Ҳеҷ натиҷае ёфт нашуд
                            </div>
                            <template v-else>
                                <div v-if="searchResults.products?.length">
                                    <div class="sidebar-section-title">Маҳсулот</div>
                                    <button v-for="p in searchResults.products" :key="'p'+p.id"
                                            class="sidebar-link"
                                            @mousedown="navigate('products'); searchFocused = false; globalSearch = ''">
                                        <Icon name="package" :size="14"/>
                                        <span>{{ p.name }} — {{ fmtMoney(p.price) }}</span>
                                    </button>
                                </div>
                                <div v-if="searchResults.clients?.length">
                                    <div class="sidebar-section-title">Клиентҳо</div>
                                    <button v-for="c in searchResults.clients" :key="'c'+c.id"
                                            class="sidebar-link"
                                            @mousedown="navigate('clients'); searchFocused = false; globalSearch = ''">
                                        <Icon name="user" :size="14"/>
                                        <span>{{ c.name }} {{ c.phone ? '· ' + c.phone : '' }}</span>
                                    </button>
                                </div>
                                <div v-if="searchResults.suppliers?.length">
                                    <div class="sidebar-section-title">Фурушандагон</div>
                                    <button v-for="s in searchResults.suppliers" :key="'s'+s.id"
                                            class="sidebar-link"
                                            @mousedown="navigate('suppliers'); searchFocused = false; globalSearch = ''">
                                        <Icon name="truck" :size="14"/>
                                        <span>{{ s.name }} {{ s.market ? '· ' + s.market : '' }}</span>
                                    </button>
                                </div>
                                <div v-if="searchResults.orders?.length">
                                    <div class="sidebar-section-title">Заявкаҳо</div>
                                    <button v-for="o in searchResults.orders" :key="'o'+o.id"
                                            class="sidebar-link"
                                            @mousedown="navigate('orders'); searchFocused = false; globalSearch = ''">
                                        <Icon name="shopping-cart" :size="14"/>
                                        <span>{{ o.order_number }} — {{ o.client_name }} ({{ fmtMoney(o.total) }})</span>
                                    </button>
                                </div>
                            </template>
                        </div>
                    </div>

                    <button class="topbar-icon" @click="window.toast?.info('Паёмҳо ба зудӣ')">
                        <Icon name="mail" :size="18" />
                    </button>
                    <button class="topbar-icon has-dot" @click="window.toast?.info('Огоҳномаҳо ба зудӣ')">
                        <Icon name="bell" :size="18" />
                    </button>

                    <div class="topbar-user">
                        <div class="avatar">A</div>
                        <div class="user-meta">
                            <div class="user-name">Алистрой</div>
                            <div class="user-email">crm@alistroy.tj</div>
                        </div>
                    </div>
                </header>

                <!-- Page content -->
                <div class="page">
                    <KeepAlive>
                        <component :is="currentComponent" :key="currentView" />
                    </KeepAlive>
                </div>
            </main>

            <!-- Toast stack -->
            <ToastStack />

            <!-- About modal -->
            <AppModal :show="aboutShow" title="Дар бораи AliStroy CRM" @close="aboutShow = false">
                <div style="text-align: center; padding: 16px 0;">
                    <div style="width: 64px; height: 64px; margin: 0 auto 12px;
                                background: var(--green-600); color: white;
                                border-radius: 16px; display: grid; place-items: center;">
                        <Icon name="home" :size="32" />
                    </div>
                    <h3 style="margin: 0 0 4px;">AliStroy CRM v1.0</h3>
                    <p style="color: var(--text-muted); margin: 0;">Идоракунии склади маҳсулоти сохтмонӣ</p>
                </div>
                <div style="margin-top: 16px;">
                    <h4 style="margin: 0 0 10px; font-size: 14px;">Имкониятҳо:</h4>
                    <ul style="margin: 0; padding-right: 18px; color: var(--text-soft); font-size: 13px; line-height: 1.8;">
                        <li>Категория ва подкатегорияҳои сохтмонӣ</li>
                        <li>Маҳсулот бо акс, нарх, захира</li>
                        <li>Таърихи тағйири нархҳо (нархи пешина нигоҳ дошта мешавад)</li>
                        <li>Фурушандагон бо бозор, телефон, рейтинг</li>
                        <li>Клиентҳо бо статусҳои гуногун</li>
                        <li>Заявкаҳо бо ҳисоби автоматии нарх ва чопи чек</li>
                        <li>Доскаи калон (Mind Map) ба монанди Xmind</li>
                        <li>Ҷустуҷӯи умумӣ дар тамоми CRM</li>
                        <li>Адаптивӣ барои мобилӣ</li>
                    </ul>
                </div>
                <template #footer>
                    <button class="btn btn-primary" @click="aboutShow = false">
                        <Icon name="check" :size="14" /> Хуб
                    </button>
                </template>
            </AppModal>
        </div>
    `,
    setup() {
        const currentView = Vue.ref('dashboard');
        const sidebarOpen = Vue.ref(false);
        const aboutShow = Vue.ref(false);
        const globalSearch = Vue.ref('');
        const searchResults = Vue.ref(null);
        const searchFocused = Vue.ref(false);
        const newOrdersCount = Vue.ref(0);
        let searchTimer = null;

        const mainNav = NAV_ITEMS.filter(n => n.section === 'main');

        const currentComponent = Vue.computed(() => VIEW_MAP[currentView.value] || VIEW_MAP.dashboard);

        function navigate(view, params) {
            if (VIEW_MAP[view]) {
                currentView.value = view;
                sidebarOpen.value = false;
                if (window.history && window.history.pushState) {
                    window.history.pushState({ view }, '', '#/' + view);
                }
            }
        }

        function onGlobalSearch() {
            clearTimeout(searchTimer);
            const q = globalSearch.value.trim();
            if (!q) { searchResults.value = null; return; }
            searchTimer = setTimeout(async () => {
                try {
                    searchResults.value = await window.API.search(q);
                } catch (e) {
                    searchResults.value = null;
                }
            }, 250);
        }

        function onSearchBlur() {
            // Дертар пӯшондан, то ки клик кор кунад
            setTimeout(() => searchFocused.value = false, 150);
        }

        const hasResults = Vue.computed(() => {
            const r = searchResults.value;
            if (!r) return false;
            return (r.products?.length || 0) + (r.clients?.length || 0)
                 + (r.suppliers?.length || 0) + (r.orders?.length || 0) > 0;
        });

        // Hash routing (back/forward)
        function readHash() {
            const m = (location.hash || '').match(/^#\/(\w+)/);
            if (m && VIEW_MAP[m[1]]) currentView.value = m[1];
        }
        window.addEventListener('hashchange', readHash);
        window.addEventListener('popstate', readHash);
        readHash();

        // Counter of new orders
        async function refreshCounters() {
            try {
                const orders = await window.API.orders.list({ status: 'new' });
                newOrdersCount.value = orders.length;
            } catch (e) { /* silent */ }
        }
        Vue.onMounted(() => {
            refreshCounters();
            // ҳар 30 сония
            setInterval(refreshCounters, 30000);
        });

        // Keyboard shortcut Ctrl/Cmd+K
        window.addEventListener('keydown', e => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                document.querySelector('.search-wrap input')?.focus();
            }
        });

        // Make navigate available globally for sub-views
        const appCtx = { navigate };

        return {
            currentView, currentComponent,
            sidebarOpen, aboutShow,
            globalSearch, searchResults, searchFocused, hasResults,
            newOrdersCount, mainNav,
            navigate, onGlobalSearch, onSearchBlur,
            fmtMoney: window.fmtMoney,
            window, // Барои toast
        };
    },
    provide() {
        return {
            app: { navigate: this.navigate },
        };
    },
};

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
    const app = Vue.createApp(App);

    // Global components
    app.component('Icon', window.IconComponent);
    app.component('AppModal', window.AppComponents.Modal);
    app.component('AppConfirm', window.AppComponents.Confirm);
    app.component('AppEmpty', window.AppComponents.Empty);
    app.component('ImageUpload', window.AppComponents.ImageUpload);
    app.component('ToastStack', window.AppComponents.ToastStack);
    app.component('OrderForm', window.AppViews.OrderForm);
    app.component('MindMapNode', window.AppViews.MindMapNode);

    app.mount('#app');
});
