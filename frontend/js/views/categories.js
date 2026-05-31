/* Categories & Subcategories view */
window.AppViews = window.AppViews || {};

window.AppViews.Categories = {
    name: 'CategoriesView',
    template: `
        <div>
            <div class="page-header">
                <div>
                    <h1>Категорияҳо ва подкатегорияҳо</h1>
                    <p>Тартиби маҳсулоти склади шумо</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-secondary" @click="openSubModal()">
                        <Icon name="plus" :size="16" /> Подкатегорияи нав
                    </button>
                    <button class="btn btn-primary" @click="openCatModal()">
                        <Icon name="plus" :size="16" /> Категорияи нав
                    </button>
                </div>
            </div>

            <div v-if="loading && !categories.length" class="empty">
                <div class="loader-spinner" style="width: 32px; height: 32px;"></div>
            </div>

            <AppEmpty v-else-if="!categories.length"
                icon="folder"
                title="Ҳоло категория нест"
                text="Барои оғоз категорияи аввалини худро илова кунед">
                <button class="btn btn-primary" @click="openCatModal()" style="margin-top: 12px">
                    <Icon name="plus" :size="16" /> Илова кардан
                </button>
            </AppEmpty>

            <div v-else class="cat-grid">
                <div v-for="cat in categories" :key="cat.id"
                     class="cat-block">
                    <div class="cat-block-header" :style="{borderColor: cat.color}">
                        <div class="cat-icon" :style="{background: cat.color}">
                            <Icon :name="cat.icon || 'folder'" :size="20" />
                        </div>
                        <div class="cat-meta">
                            <h3>{{ cat.name }}</h3>
                            <div class="cat-stats">
                                {{ cat.subcategories_count }} подкатегория ·
                                {{ cat.products_count }} маҳсулот
                            </div>
                        </div>
                        <div class="cat-actions">
                            <button class="btn-icon btn btn-ghost" @click="openCatModal(cat)" title="Таҳрир">
                                <Icon name="edit" :size="14" />
                            </button>
                            <button class="btn-icon btn btn-ghost" @click="askDeleteCat(cat)" title="Нест кардан">
                                <Icon name="trash" :size="14" />
                            </button>
                        </div>
                    </div>

                    <div class="sub-list">
                        <div v-for="sub in cat.subcategories" :key="sub.id" class="sub-item">
                            <div class="sub-item-name">
                                <Icon name="folder" :size="14" />
                                <span>{{ sub.name }}</span>
                                <span class="pill pill-gray">{{ sub.products_count }}</span>
                            </div>
                            <div class="row-actions">
                                <button class="btn-icon btn btn-ghost" @click="openSubModal(sub, cat)" title="Таҳрир">
                                    <Icon name="edit" :size="12" />
                                </button>
                                <button class="btn-icon btn btn-ghost" @click="askDeleteSub(sub)" title="Нест кардан">
                                    <Icon name="trash" :size="12" />
                                </button>
                            </div>
                        </div>
                        <button class="add-sub-btn" @click="openSubModal(null, cat)">
                            <Icon name="plus" :size="14" /> Илова подкатегория
                        </button>
                    </div>
                </div>
            </div>

            <!-- Category Modal -->
            <AppModal :show="catShow" :title="catEdit?.id ? 'Таҳрири категория' : 'Категорияи нав'"
                      @close="catShow = false">
                <div class="form-grid">
                    <div class="form-group full">
                        <label class="form-label">Ном <span class="req">*</span></label>
                        <input v-model="catForm.name" class="form-input" placeholder="Масалан: Семент" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Иконка</label>
                        <select v-model="catForm.icon" class="form-select">
                            <option value="folder">Папка</option>
                            <option value="package">Бастаи</option>
                            <option value="box">Қути</option>
                            <option value="tool">Олат</option>
                            <option value="grid">Тур</option>
                            <option value="layers">Қабатҳо</option>
                            <option value="droplet">Қатра</option>
                            <option value="home">Хона</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Ранг</label>
                        <input v-model="catForm.color" type="color" class="form-input" style="height: 42px" />
                    </div>
                    <div class="form-group full">
                        <label class="form-label">Тавсиф</label>
                        <textarea v-model="catForm.description" class="form-textarea" placeholder="Тавсифи ихтиёрӣ"></textarea>
                    </div>
                </div>
                <template #footer>
                    <button class="btn btn-ghost" @click="catShow = false">Бекор</button>
                    <button class="btn btn-primary" @click="saveCat" :disabled="!catForm.name.trim()">
                        <Icon name="check" :size="14" /> Захира
                    </button>
                </template>
            </AppModal>

            <!-- Subcategory Modal -->
            <AppModal :show="subShow" :title="subEdit?.id ? 'Таҳрири подкатегория' : 'Подкатегорияи нав'"
                      @close="subShow = false">
                <div class="form-grid">
                    <div class="form-group full">
                        <label class="form-label">Ном <span class="req">*</span></label>
                        <input v-model="subForm.name" class="form-input" placeholder="Масалан: Семент М400" />
                    </div>
                    <div class="form-group full">
                        <label class="form-label">Категория <span class="req">*</span></label>
                        <select v-model="subForm.category_id" class="form-select">
                            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
                        </select>
                    </div>
                    <div class="form-group full">
                        <label class="form-label">Тавсиф</label>
                        <textarea v-model="subForm.description" class="form-textarea"></textarea>
                    </div>
                </div>
                <template #footer>
                    <button class="btn btn-ghost" @click="subShow = false">Бекор</button>
                    <button class="btn btn-primary" @click="saveSub"
                            :disabled="!subForm.name.trim() || !subForm.category_id">
                        <Icon name="check" :size="14" /> Захира
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
        const categories = Vue.ref([]);
        const loading = Vue.ref(false);

        const catShow = Vue.ref(false);
        const catEdit = Vue.ref(null);
        const catForm = Vue.reactive({ name: '', icon: 'folder', color: '#16a34a', description: '' });

        const subShow = Vue.ref(false);
        const subEdit = Vue.ref(null);
        const subForm = Vue.reactive({ name: '', category_id: null, description: '' });

        const confirm = Vue.reactive({ show: false, title: '', text: '', confirmText: 'Нест кардан', action: null });

        async function load() {
            loading.value = true;
            try {
                categories.value = await window.API.categories.list(true);
            } catch (e) { window.toast.error(e.message); }
            finally { loading.value = false; }
        }

        function openCatModal(cat) {
            catEdit.value = cat || null;
            Object.assign(catForm, {
                name: cat?.name || '',
                icon: cat?.icon || 'folder',
                color: cat?.color || '#16a34a',
                description: cat?.description || '',
            });
            catShow.value = true;
        }

        function openSubModal(sub, cat) {
            subEdit.value = sub || null;
            Object.assign(subForm, {
                name: sub?.name || '',
                category_id: sub?.category_id || cat?.id || categories.value[0]?.id || null,
                description: sub?.description || '',
            });
            subShow.value = true;
        }

        async function saveCat() {
            try {
                if (catEdit.value?.id) {
                    await window.API.categories.update(catEdit.value.id, catForm);
                    window.toast.success('Категория навсозӣ шуд');
                } else {
                    await window.API.categories.create(catForm);
                    window.toast.success('Категория илова шуд');
                }
                catShow.value = false;
                window.EventBus?.emit('data:categories'); await load();
            } catch (e) { window.toast.error(e.message); }
        }

        async function saveSub() {
            try {
                if (subEdit.value?.id) {
                    await window.API.subcategories.update(subEdit.value.id, subForm);
                    window.toast.success('Подкатегория навсозӣ шуд');
                } else {
                    await window.API.subcategories.create(subForm);
                    window.toast.success('Подкатегория илова шуд'); window.EventBus?.emit('data:subcategories');
                }
                subShow.value = false;
                window.EventBus?.emit('data:categories'); await load();
            } catch (e) { window.toast.error(e.message); }
        }

        function askDeleteCat(cat) {
            Object.assign(confirm, {
                show: true,
                title: 'Нест кардани категория',
                text: `Категорияи "${cat.name}" ва ҳамаи подкатегорияву маҳсулоти он нест мешаванд!`,
                confirmText: 'Нест кардан',
                action: async () => {
                    try {
                        await window.API.categories.remove(cat.id);
                        window.toast.success('Категория нест шуд');
                        confirm.show = false;
                        window.EventBus?.emit('data:categories'); await load();
                    } catch (e) { window.toast.error(e.message); }
                },
            });
        }

        function askDeleteSub(sub) {
            Object.assign(confirm, {
                show: true,
                title: 'Нест кардани подкатегория',
                text: `Подкатегорияи "${sub.name}" ва маҳсулоти он нест мешаванд!`,
                confirmText: 'Нест кардан',
                action: async () => {
                    try {
                        await window.API.subcategories.remove(sub.id);
                        window.toast.success('Подкатегория нест шуд'); window.EventBus?.emit('data:subcategories');
                        confirm.show = false;
                        window.EventBus?.emit('data:categories'); await load();
                    } catch (e) { window.toast.error(e.message); }
                },
            });
        }

        const _evtCleanup = [];
        Vue.onMounted(() => {
            load();
            ['data:categories', 'data:subcategories', 'data:products'].forEach(ev => {
                const off = window.EventBus?.on(ev, load);
                if (off) _evtCleanup.push(off);
            });
        });
        Vue.onUnmounted(() => { _evtCleanup.forEach(fn => fn()); });

        return {
            categories, loading,
            catShow, catEdit, catForm,
            subShow, subEdit, subForm,
            confirm,
            openCatModal, openSubModal,
            saveCat, saveSub,
            askDeleteCat, askDeleteSub,
        };
    },
};
