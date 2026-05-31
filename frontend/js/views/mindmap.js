/* Mind Map view — Доска barojai мисли Xmind */
window.AppViews = window.AppViews || {};

window.AppViews.MindMap = {
    name: 'MindMapView',
    template: `
        <div>
            <div class="page-header">
                <div>
                    <h1>Доскаи калон</h1>
                    <p>Намоиши иерархияи категория → подкатегория → маҳсулот ба монанди Xmind</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-secondary" @click="expandAll">
                        <Icon name="expand" :size="16" /> Ҳамаро кушодан
                    </button>
                    <button class="btn btn-secondary" @click="collapseAll">
                        <Icon name="chevron-up" :size="16" /> Ҷамъ кардан
                    </button>
                </div>
            </div>

            <!-- Search & filters -->
            <div class="filter-row">
                <div style="flex: 1; min-width: 200px; position: relative; max-width: 420px;">
                    <Icon name="search" :size="16" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted)" />
                    <input v-model="search" class="form-input" style="padding-left: 40px"
                           placeholder="Ҷустуҷӯ дар Mind Map..."
                           @input="onSearch" />
                </div>
                <div class="mindmap-zoom">
                    <button @click="zoom -= 0.1" :disabled="zoom <= 0.4" title="Хурдтар">
                        <Icon name="zoom-out" :size="16" />
                    </button>
                    <span class="level">{{ Math.round(zoom * 100) }}%</span>
                    <button @click="zoom += 0.1" :disabled="zoom >= 2" title="Калонтар">
                        <Icon name="zoom-in" :size="16" />
                    </button>
                    <button @click="zoom = 1" title="Аз нав">
                        <Icon name="refresh" :size="16" />
                    </button>
                </div>
            </div>

            <div v-if="loading" class="empty">
                <div class="loader-spinner" style="width: 32px; height: 32px;"></div>
            </div>

            <AppEmpty v-else-if="!tree?.children?.length"
                icon="grid"
                title="Mind Map холӣ"
                text="Аввал категория ва маҳсулот илова кунед" />

            <div v-else class="mindmap-wrap"
                 ref="canvas"
                 @mousedown="onPanStart"
                 @mousemove="onPanMove"
                 @mouseup="onPanEnd"
                 @mouseleave="onPanEnd">
                <div class="mindmap-canvas" :style="{ transform: 'scale(' + zoom + ')' }">
                    <!-- Root -->
                    <div class="tree-node">
                        <div class="node-card is-root">
                            <div class="node-name">{{ tree.name }}</div>
                            <div class="node-sub" style="color: rgba(255,255,255,.8)">
                                {{ totalProducts }} маҳсулот · {{ tree.children.length }} категория
                            </div>
                        </div>
                        <div class="tree-children">
                            <MindMapNode
                                v-for="cat in filteredTree.children"
                                :key="cat.id"
                                :node="cat"
                                :level="1"
                                :search="search.toLowerCase()"
                                :expanded-set="expandedSet"
                                @toggle="toggleNode" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Legend -->
            <div style="display: flex; gap: 16px; margin-top: 14px; flex-wrap: wrap; font-size: 12px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 14px; height: 14px; border-radius: 4px; background: var(--green-600);"></div>
                    Реша
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 14px; height: 14px; border-radius: 4px; background: var(--green-50); border: 2px solid var(--green-400);"></div>
                    Категория
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 14px; height: 14px; border-radius: 4px; background: #eff6ff; border: 2px solid var(--blue);"></div>
                    Подкатегория
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 14px; height: 14px; border-radius: 4px; background: #faf5ff; border: 2px solid #c084fc;"></div>
                    Маҳсулот
                </div>
            </div>
        </div>
    `,
    setup() {
        const tree = Vue.ref(null);
        const loading = Vue.ref(false);
        const search = Vue.ref('');
        const zoom = Vue.ref(1);
        const expandedSet = Vue.ref(new Set());
        const canvas = Vue.ref(null);

        const totalProducts = Vue.computed(() => {
            if (!tree.value) return 0;
            let n = 0;
            (tree.value.children || []).forEach(c => {
                (c.children || []).forEach(s => {
                    n += (s.children || []).length;
                });
            });
            return n;
        });

        const filteredTree = Vue.computed(() => {
            if (!tree.value) return { children: [] };
            const q = search.value.trim().toLowerCase();
            if (!q) return tree.value;
            // Филтр кардан вале сохторро ҳифз кардан
            const cats = (tree.value.children || []).map(c => {
                const subs = (c.children || []).map(s => {
                    const prods = (s.children || []).filter(p =>
                        p.name.toLowerCase().includes(q));
                    if (prods.length || s.name.toLowerCase().includes(q)) {
                        return { ...s, children: prods.length ? prods : s.children };
                    }
                    return null;
                }).filter(Boolean);
                if (subs.length || c.name.toLowerCase().includes(q)) {
                    return { ...c, children: subs.length ? subs : c.children };
                }
                return null;
            }).filter(Boolean);
            return { ...tree.value, children: cats };
        });

        async function load() {
            loading.value = true;
            try {
                tree.value = await window.API.mindmap();
                // Ҳамаи категорияҳоро бо нобаёнӣ кушода нигоҳ медорем
                const set = new Set();
                (tree.value.children || []).forEach(c => set.add(c.id));
                expandedSet.value = set;
            } catch (e) { window.toast.error(e.message); }
            finally { loading.value = false; }
        }

        function toggleNode(id) {
            const s = new Set(expandedSet.value);
            if (s.has(id)) s.delete(id); else s.add(id);
            expandedSet.value = s;
        }

        function expandAll() {
            const s = new Set();
            function walk(n) {
                s.add(n.id);
                (n.children || []).forEach(walk);
            }
            (tree.value?.children || []).forEach(walk);
            expandedSet.value = s;
        }

        function collapseAll() { expandedSet.value = new Set(); }

        function onSearch() {
            // Дар ҷустуҷӯ ҳамаро кушодан
            if (search.value.trim()) expandAll();
        }

        // Pan & drag
        const pan = Vue.reactive({ active: false, startX: 0, startY: 0, scrollX: 0, scrollY: 0 });
        function onPanStart(e) {
            if (e.target.closest('.node-card')) return; // не из узла
            pan.active = true;
            pan.startX = e.clientX;
            pan.startY = e.clientY;
            pan.scrollX = canvas.value.scrollLeft;
            pan.scrollY = canvas.value.scrollTop;
            canvas.value.classList.add('grabbing');
        }
        function onPanMove(e) {
            if (!pan.active) return;
            canvas.value.scrollLeft = pan.scrollX - (e.clientX - pan.startX);
            canvas.value.scrollTop = pan.scrollY - (e.clientY - pan.startY);
        }
        function onPanEnd() {
            pan.active = false;
            if (canvas.value) canvas.value.classList.remove('grabbing');
        }

        Vue.onMounted(load);

        return {
            tree, filteredTree, loading, search, zoom,
            expandedSet, canvas, totalProducts,
            toggleNode, expandAll, collapseAll, onSearch,
            onPanStart, onPanMove, onPanEnd,
        };
    },
};

// Recursive node component
window.AppViews.MindMapNode = {
    name: 'MindMapNode',
    props: ['node', 'level', 'search', 'expandedSet'],
    emits: ['toggle'],
    template: `
        <div class="tree-node">
            <div :class="['node-card', cardClass]" @click="onClick">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <Icon v-if="hasChildren"
                          :name="isExpanded ? 'chevron-down' : 'chevron-right'"
                          :size="14" />
                    <Icon v-if="node.icon" :name="node.icon" :size="14" />
                    <div style="flex: 1; min-width: 0">
                        <div class="node-name">{{ node.name }}</div>
                        <div class="node-sub" v-if="node.type === 'category'">
                            {{ subCount }} подкатегория
                        </div>
                        <div class="node-sub" v-else-if="node.type === 'subcategory'">
                            {{ prodCount }} маҳсулот
                        </div>
                        <div class="node-sub" v-else-if="node.type === 'product'">
                            {{ fmtMoney(node.price) }} · {{ node.stock }} {{ node.unit }}
                        </div>
                    </div>
                </div>
            </div>
            <div v-if="hasChildren && isExpanded" class="tree-children">
                <MindMapNode v-for="child in node.children" :key="child.id"
                             :node="child" :level="level + 1"
                             :search="search"
                             :expanded-set="expandedSet"
                             @toggle="$emit('toggle', $event)" />
            </div>
        </div>
    `,
    computed: {
        hasChildren() { return this.node.children && this.node.children.length > 0; },
        isExpanded() { return this.expandedSet.has(this.node.id); },
        cardClass() {
            return {
                'is-category': this.node.type === 'category',
                'is-subcategory': this.node.type === 'subcategory',
                'is-product': this.node.type === 'product',
            };
        },
        subCount() { return (this.node.children || []).length; },
        prodCount() { return (this.node.children || []).length; },
    },
    methods: {
        onClick() {
            if (this.hasChildren) this.$emit('toggle', this.node.id);
        },
        fmtMoney(v) { return window.fmtMoney(v); },
    },
};
