/* AliStroy CRM API client (with auth token) */
window.API = (function () {
    const base = '/api';
    const TOKEN_KEY = 'alistroy_token';

    function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
    function setToken(t) {
        if (t) localStorage.setItem(TOKEN_KEY, t);
        else localStorage.removeItem(TOKEN_KEY);
    }

    async function req(path, opts = {}) {
        const headers = opts.headers || {};
        const token = getToken();
        if (token) headers['Authorization'] = 'Bearer ' + token;
        const config = { method: opts.method || 'GET', headers };
        if (opts.body !== undefined && !(opts.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
            config.body = JSON.stringify(opts.body);
        } else if (opts.body instanceof FormData) {
            config.body = opts.body;
        }
        const res = await fetch(base + path, config);

        if (res.status === 401) {
            setToken('');
            // Бар auth.js нишонае диҳад
            window.dispatchEvent(new CustomEvent('auth:logout'));
            throw new Error('Авторизация лозим');
        }
        if (!res.ok) {
            let err;
            try { err = await res.json(); } catch (e) { err = { error: res.statusText }; }
            throw new Error(err.error || 'Хатогӣ');
        }
        if (res.status === 204) return null;
        return res.json();
    }

    // Боргирии файл (binary)
    async function downloadFile(path, filename) {
        const token = getToken();
        const res = await fetch(base + path, {
            headers: token ? { 'Authorization': 'Bearer ' + token } : {},
        });
        if (!res.ok) {
            throw new Error('Хатои боргирӣ');
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Filename аз header-и Content-Disposition (агар бошад)
        const cd = res.headers.get('Content-Disposition') || '';
        const m = cd.match(/filename="([^"]+)"/);
        a.download = m ? m[1] : (filename || 'export');
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    return {
        // Token management
        token: { get: getToken, set: setToken },

        // Auth
        auth: {
            login: (username, password) =>
                req('/auth/login', { method: 'POST', body: { username, password } }),
            logout: () => req('/auth/logout', { method: 'POST' }).catch(() => null),
            me: () => req('/auth/me'),
        },

        // Health
        health: () => req('/health'),

        // Categories
        categories: {
            list: (tree = false) => req('/categories' + (tree ? '?tree=1' : '')),
            create: (data) => req('/categories', { method: 'POST', body: data }),
            update: (id, data) => req('/categories/' + id, { method: 'PUT', body: data }),
            remove: (id) => req('/categories/' + id, { method: 'DELETE' }),
        },

        // Subcategories
        subcategories: {
            list: (catId) => req('/subcategories' + (catId ? '?category_id=' + catId : '')),
            create: (data) => req('/subcategories', { method: 'POST', body: data }),
            update: (id, data) => req('/subcategories/' + id, { method: 'PUT', body: data }),
            remove: (id) => req('/subcategories/' + id, { method: 'DELETE' }),
        },

        // Products
        products: {
            list: (params = {}) => {
                const qs = new URLSearchParams();
                Object.entries(params).forEach(([k, v]) => {
                    if (v !== '' && v !== null && v !== undefined) qs.set(k, v);
                });
                const s = qs.toString();
                return req('/products' + (s ? '?' + s : ''));
            },
            get: (id) => req('/products/' + id),
            create: (data) => req('/products', { method: 'POST', body: data }),
            update: (id, data) => req('/products/' + id, { method: 'PUT', body: data }),
            remove: (id) => req('/products/' + id, { method: 'DELETE' }),
            history: (id) => req('/products/' + id + '/price-history'),
        },

        // Suppliers
        suppliers: {
            list: (q = '') => req('/suppliers' + (q ? '?q=' + encodeURIComponent(q) : '')),
            get: (id) => req('/suppliers/' + id),
            create: (data) => req('/suppliers', { method: 'POST', body: data }),
            update: (id, data) => req('/suppliers/' + id, { method: 'PUT', body: data }),
            remove: (id) => req('/suppliers/' + id, { method: 'DELETE' }),
        },

        // Clients
        clients: {
            list: (q = '') => req('/clients' + (q ? '?q=' + encodeURIComponent(q) : '')),
            get: (id) => req('/clients/' + id),
            create: (data) => req('/clients', { method: 'POST', body: data }),
            update: (id, data) => req('/clients/' + id, { method: 'PUT', body: data }),
            remove: (id) => req('/clients/' + id, { method: 'DELETE' }),
        },

        // Orders
        orders: {
            list: (params = {}) => {
                const qs = new URLSearchParams();
                Object.entries(params).forEach(([k, v]) => {
                    if (v !== '' && v !== null && v !== undefined) qs.set(k, v);
                });
                const s = qs.toString();
                return req('/orders' + (s ? '?' + s : ''));
            },
            get: (id) => req('/orders/' + id),
            create: (data) => req('/orders', { method: 'POST', body: data }),
            update: (id, data) => req('/orders/' + id, { method: 'PUT', body: data }),
            remove: (id) => req('/orders/' + id, { method: 'DELETE' }),
        },

        // Expenses
        expenses: {
            list: (params = {}) => {
                const qs = new URLSearchParams();
                Object.entries(params).forEach(([k, v]) => {
                    if (v !== '' && v !== null && v !== undefined) qs.set(k, v);
                });
                const s = qs.toString();
                return req('/expenses' + (s ? '?' + s : ''));
            },
            create: (data) => req('/expenses', { method: 'POST', body: data }),
            update: (id, data) => req('/expenses/' + id, { method: 'PUT', body: data }),
            remove: (id) => req('/expenses/' + id, { method: 'DELETE' }),
        },

        // Finance
        finance: (period = 'all') => req('/finance/stats?period=' + period),

        // Dashboard / Mind map / Search
        dashboard: () => req('/dashboard/stats'),
        mindmap: () => req('/mindmap'),
        search: (q) => req('/search?q=' + encodeURIComponent(q)),

        // Upload
        upload: (file) => {
            const fd = new FormData();
            fd.append('file', file);
            return req('/upload', { method: 'POST', body: fd });
        },

        // Export
        export: (entity, format = 'xlsx') =>
            downloadFile(`/export/${entity}?format=${format}`),
    };
})();

// Global Event Bus — барои auto-refresh-и саҳифаҳо
window.EventBus = (function () {
    const listeners = {};
    return {
        on(event, cb) {
            (listeners[event] = listeners[event] || []).push(cb);
            return () => {
                listeners[event] = (listeners[event] || []).filter(x => x !== cb);
            };
        },
        emit(event, payload) {
            (listeners[event] || []).forEach(cb => {
                try { cb(payload); } catch (e) { console.error(e); }
            });
        },
    };
})();
