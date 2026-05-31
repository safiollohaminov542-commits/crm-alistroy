/* Reusable UI components: Modal, Toast, Confirm */

window.AppComponents = window.AppComponents || {};

// ---------- Modal ----------
window.AppComponents.Modal = {
    name: 'AppModal',
    props: {
        title: String,
        size: { type: String, default: '' }, // '', 'lg', 'xl'
        show: Boolean,
    },
    emits: ['close'],
    template: `
        <Teleport to="body">
            <Transition>
                <div v-if="show" class="modal-backdrop" @click.self="$emit('close')">
                    <div class="modal" :class="size">
                        <div class="modal-header">
                            <h3>{{ title }}</h3>
                            <button class="modal-close" @click="$emit('close')">
                                <Icon name="x" :size="18" />
                            </button>
                        </div>
                        <div class="modal-body">
                            <slot></slot>
                        </div>
                        <div class="modal-footer" v-if="$slots.footer">
                            <slot name="footer"></slot>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>
    `,
};

// ---------- Confirm dialog ----------
window.AppComponents.Confirm = {
    name: 'AppConfirm',
    props: {
        show: Boolean,
        title: { type: String, default: 'Тасдиқ' },
        text: { type: String, default: 'Шумо мутмаин ҳастед?' },
        confirmText: { type: String, default: 'Бале, давом' },
        danger: { type: Boolean, default: false },
    },
    emits: ['close', 'confirm'],
    template: `
        <Teleport to="body">
            <div v-if="show" class="modal-backdrop" @click.self="$emit('close')">
                <div class="modal" style="max-width: 420px">
                    <div class="modal-body" style="text-align: center; padding: 32px 24px">
                        <div style="width: 56px; height: 56px; border-radius: 50%;
                                    margin: 0 auto 14px;
                                    display: grid; place-items: center;
                                    background: var(--bg);
                                    color: var(--text-soft);"
                             :style="danger ? 'background: #fee2e2; color: var(--red);' : ''">
                            <Icon :name="danger ? 'alert-triangle' : 'help'" :size="26" />
                        </div>
                        <h3 style="margin: 0 0 8px; font-size: 18px;">{{ title }}</h3>
                        <p style="color: var(--text-muted); margin: 0;">{{ text }}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-ghost" @click="$emit('close')">Бекор кардан</button>
                        <button class="btn"
                                :class="danger ? 'btn-danger' : 'btn-primary'"
                                @click="$emit('confirm')">
                            {{ confirmText }}
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>
    `,
};

// ---------- Toast manager ----------
window.AppComponents.ToastStack = {
    name: 'ToastStack',
    template: `
        <Teleport to="body">
            <div class="toast-stack">
                <div v-for="t in items" :key="t.id" class="toast" :class="t.type || ''">
                    <div class="toast-icon">
                        <Icon :name="iconFor(t.type)" :size="16" />
                    </div>
                    <div class="toast-content">
                        <strong v-if="t.title">{{ t.title }}</strong>
                        <span>{{ t.text }}</span>
                    </div>
                </div>
            </div>
        </Teleport>
    `,
    setup() {
        const items = Vue.ref([]);
        let nextId = 1;

        function add(type, text, title) {
            const t = { id: nextId++, type, text, title };
            items.value.push(t);
            setTimeout(() => {
                items.value = items.value.filter(x => x.id !== t.id);
            }, 3500);
        }

        function iconFor(type) {
            return ({
                'success': 'check-circle',
                'error': 'alert-triangle',
                'warning': 'alert-triangle',
                'info': 'info',
            })[type || 'success'] || 'check-circle';
        }

        // Global access
        window.toast = {
            success: (text, title) => add('success', text, title),
            error: (text, title) => add('error', text, title || 'Хатогӣ'),
            warning: (text, title) => add('warning', text, title),
            info: (text, title) => add('info', text, title),
        };

        return { items, iconFor };
    },
};

// ---------- Empty state ----------
window.AppComponents.Empty = {
    name: 'AppEmpty',
    props: {
        icon: { type: String, default: 'box' },
        title: { type: String, default: 'Маълумот нест' },
        text: String,
    },
    template: `
        <div class="empty">
            <div class="empty-icon"><Icon :name="icon" :size="28" /></div>
            <h4>{{ title }}</h4>
            <p v-if="text">{{ text }}</p>
            <slot></slot>
        </div>
    `,
};

// ---------- Image upload ----------
window.AppComponents.ImageUpload = {
    name: 'ImageUpload',
    props: {
        modelValue: { type: String, default: '' },
        label: { type: String, default: 'Илова кардани акс' },
    },
    emits: ['update:modelValue'],
    template: `
        <label class="upload-box" :class="{ 'has-image': modelValue }">
            <img v-if="modelValue" :src="modelValue" alt="Акс" />
            <template v-else>
                <Icon name="upload" :size="28" />
                <div style="margin-top: 8px; font-size: 12px;">{{ uploading ? 'Бор шуда истодааст...' : label }}</div>
                <div style="font-size: 11px; margin-top: 4px;">PNG, JPG (то 16MB)</div>
            </template>
            <input type="file" accept="image/*" @change="onSelect" hidden />
        </label>
    `,
    setup(props, { emit }) {
        const uploading = Vue.ref(false);

        async function onSelect(e) {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            uploading.value = true;
            try {
                const r = await window.API.upload(file);
                emit('update:modelValue', r.url);
                window.toast.success('Акс бор шуд');
            } catch (err) {
                window.toast.error(err.message);
            } finally {
                uploading.value = false;
                e.target.value = '';
            }
        }

        return { uploading, onSelect };
    },
};

// ---------- Helpers ----------
window.fmtMoney = function (val, currency = 'TJS') {
    if (val === null || val === undefined || isNaN(val)) return '0';
    const n = Number(val);
    return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' ' + (currency || 'TJS');
};

window.fmtDate = function (val) {
    if (!val) return '';
    const d = new Date(val.replace(' ', 'T'));
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

window.fmtDateTime = function (val) {
    if (!val) return '';
    const d = new Date(val.replace(' ', 'T'));
    if (isNaN(d.getTime())) return val;
    return d.toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};

window.statusLabel = function (s) {
    return ({
        'new': 'Нав',
        'in_progress': 'Дар ҳол',
        'completed': 'Анҷом',
        'cancelled': 'Бекор',
        'active': 'Фаъол',
        'vip': 'VIP',
        'blocked': 'Манъ',
    })[s] || s;
};

window.statusPill = function (s) {
    return ({
        'new': 'pill-blue',
        'in_progress': 'pill-orange',
        'completed': 'pill-green',
        'cancelled': 'pill-red',
        'active': 'pill-green',
        'vip': 'pill-purple',
        'blocked': 'pill-red',
    })[s] || 'pill-gray';
};
