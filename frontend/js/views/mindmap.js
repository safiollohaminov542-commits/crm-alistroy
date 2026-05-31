/* Free-form Mind Map view (Xmind-style):
   - Pan ба ҳама самт бо муш (drag дар ҷои холӣ)
   - Ctrl+wheel = zoom in/out
   - Wheel оддӣ = scroll vertical/horizontal
   - Ҷойгузории озоди гиреҳҳо (drag node)
   - Auto-layout радиалӣ дар оғоз
*/
window.AppViews = window.AppViews || {};

window.AppViews.MindMap = {
    name: 'MindMapView',
    template: `
        <div class="mindmap-page">
            <div class="page-header">
                <div>
                    <h1>Доскаи калон</h1>
                    <p>Иерархияи Категория → Подкатегория → Маҳсулот</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-secondary" @click="autoLayout">
                        <Icon name="refresh" :size="16" /> Аз нав ҷойгузорӣ
                    </button>
                    <button class="btn btn-secondary" @click="reset">
                        <Icon name="target" :size="16" /> Бозгашт ба марказ
                    </button>
                </div>
            </div>

            <!-- Toolbar -->
            <div class="mindmap-toolbar-row">
                <div style="flex: 1; max-width: 360px; position: relative;">
                    <Icon name="search" :size="16" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted)" />
                    <input v-model="search" class="form-input" style="padding-left: 40px"
                           placeholder="Ҷустуҷӯ дар Mind Map..." />
                </div>
                <div class="mindmap-zoom">
                    <button @click="zoomBy(-0.1)" :disabled="zoom <= 0.3" title="Хурдтар">
                        <Icon name="zoom-out" :size="16" />
                    </button>
                    <span class="level">{{ Math.round(zoom * 100) }}%</span>
                    <button @click="zoomBy(0.1)" :disabled="zoom >= 2.5" title="Калонтар">
                        <Icon name="zoom-in" :size="16" />
                    </button>
                    <button @click="zoom = 1; reset()" title="Аз нав 100%">
                        <Icon name="refresh" :size="16" />
                    </button>
                </div>
                <div class="mindmap-hint">
                    <Icon name="info" :size="14" />
                    <span>Ctrl + ролик = zoom · ролик = пешу қафо · drag = ҳаракат</span>
                </div>
            </div>

            <div v-if="loading && !nodes.length" class="empty">
                <div class="loader-spinner" style="width: 32px; height: 32px;"></div>
            </div>

            <AppEmpty v-else-if="!nodes.length"
                icon="grid"
                title="Mind Map холӣ"
                text="Аввал категория ва маҳсулот илова кунед" />

            <!-- Canvas -->
            <div v-else
                 class="mindmap-canvas-wrap"
                 ref="wrap"
                 @mousedown="onCanvasDown"
                 @mousemove="onCanvasMove"
                 @mouseup="onCanvasUp"
                 @mouseleave="onCanvasUp"
                 @wheel.prevent="onWheel"
                 @touchstart="onTouchStart"
                 @touchmove="onTouchMove"
                 @touchend="onCanvasUp">

                <div class="mindmap-canvas" :style="canvasStyle">
                    <!-- SVG барои хатҳои пайвасткунандаи гиреҳҳо -->
                    <svg class="mindmap-svg" :width="canvasW" :height="canvasH">
                        <path v-for="link in links" :key="link.id"
                              :d="link.d"
                              :stroke="link.color"
                              stroke-width="2"
                              fill="none" />
                    </svg>

                    <!-- Гиреҳҳо -->
                    <div v-for="node in visibleNodes" :key="node.id"
                         class="mm-node" :class="'mm-' + node.type"
                         :style="{ left: node.x + 'px', top: node.y + 'px',
                                   borderColor: node.color || '' }"
                         :class-active="hilite.has(node.id)"
                         @mousedown.stop="onNodeDown($event, node)"
                         @touchstart.stop="onNodeTouch($event, node)">
                        <div class="mm-node-inner" :class="{ 'is-match': isMatch(node) }">
                            <div class="mm-node-title">
                                <Icon v-if="node.icon" :name="node.icon" :size="14" />
                                <span>{{ node.name }}</span>
                            </div>
                            <div v-if="node.type === 'product'" class="mm-node-meta">
                                {{ fmtMoney(node.price) }} · {{ node.stock }} {{ node.unit }}
                            </div>
                            <div v-else-if="node.type === 'category'" class="mm-node-meta">
                                {{ getChildCount(node.id) }} подкатегория
                            </div>
                            <div v-else-if="node.type === 'subcategory'" class="mm-node-meta">
                                {{ getChildCount(node.id) }} маҳсулот
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Mini-map (хорита) -->
                <div class="mindmap-minimap" v-if="nodes.length > 5">
                    <div class="mindmap-minimap-content"
                         :style="{ transform: 'scale(' + minimapScale + ')' }">
                        <div v-for="node in nodes" :key="node.id"
                             class="mm-mini-dot"
                             :style="{
                                 left: node.x + 'px',
                                 top: node.y + 'px',
                                 background: node.type === 'category' ? 'var(--green-600)' :
                                             node.type === 'subcategory' ? 'var(--blue)' : '#c084fc',
                             }"></div>
                        <div class="mm-mini-viewport"
                             :style="{
                                 left: (-pan.x / zoom) + 'px',
                                 top: (-pan.y / zoom) + 'px',
                                 width: (viewportW / zoom) + 'px',
                                 height: (viewportH / zoom) + 'px',
                             }"></div>
                    </div>
                </div>
            </div>
        </div>
    `,
    setup() {
        const tree = Vue.ref(null);
        const loading = Vue.ref(false);
        const search = Vue.ref('');

        const wrap = Vue.ref(null);
        const zoom = Vue.ref(1);
        const pan = Vue.reactive({ x: 0, y: 0 });

        // Node state — ҷойгузории озод
        const nodes = Vue.ref([]); // { id, type, name, x, y, parent, color, icon, ... }
        const links = Vue.ref([]); // { id, d, color }

        // Drag state
        const drag = Vue.reactive({
            mode: null, // 'canvas' | 'node'
            startX: 0, startY: 0, origX: 0, origY: 0, node: null,
        });

        const viewportW = Vue.ref(0);
        const viewportH = Vue.ref(0);
        const canvasW = 4000;
        const canvasH = 3000;

        const hilite = Vue.computed(() => new Set());

        function isMatch(node) {
            const q = search.value.trim().toLowerCase();
            if (!q) return false;
            return node.name.toLowerCase().includes(q);
        }

        const visibleNodes = Vue.computed(() => nodes.value);

        const canvasStyle = Vue.computed(() => ({
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom.value})`,
            transformOrigin: '0 0',
            width: canvasW + 'px',
            height: canvasH + 'px',
        }));

        const minimapScale = Vue.computed(() => 200 / canvasW);

        async function load() {
            loading.value = true;
            try {
                tree.value = await window.API.mindmap();
                autoLayout();
            } catch (e) {
                window.toast?.error(e.message);
            } finally {
                loading.value = false;
            }
        }

        // Auto-layout: радиалӣ — реша дар марказ, категорияҳо доира,
        // подкатегория ва маҳсулот ба принсипи дарахт
        function autoLayout() {
            if (!tree.value) return;
            const newNodes = [];
            const newLinks = [];

            const cx = canvasW / 2;
            const cy = canvasH / 2;

            // Root
            newNodes.push({
                id: 'root',
                type: 'root',
                name: tree.value.name,
                x: cx - 90, y: cy - 30,
                color: '#16a34a',
                w: 180, h: 60,
            });

            const cats = tree.value.children || [];
            const radiusCat = 360;

            cats.forEach((cat, ci) => {
                const angle = (ci / cats.length) * 2 * Math.PI - Math.PI / 2;
                const cxx = cx + Math.cos(angle) * radiusCat - 90;
                const cyy = cy + Math.sin(angle) * radiusCat - 25;

                const catNode = {
                    id: cat.id, real_id: cat.real_id, type: 'category',
                    name: cat.name, color: cat.color || '#16a34a',
                    icon: cat.icon, x: cxx, y: cyy,
                    parent: 'root', w: 180, h: 50,
                };
                newNodes.push(catNode);
                newLinks.push({
                    id: `l-root-${cat.id}`,
                    fromId: 'root', toId: cat.id,
                    color: cat.color || '#16a34a',
                });

                const subs = cat.children || [];
                const radiusSub = 220;
                subs.forEach((sub, si) => {
                    // Subkategoria — ёзаш мекунем дар атрофи category
                    const a2 = angle + ((si - (subs.length - 1) / 2) * 0.45);
                    const sx = cxx + 90 + Math.cos(a2) * radiusSub - 80;
                    const sy = cyy + 25 + Math.sin(a2) * radiusSub - 20;

                    const subNode = {
                        id: sub.id, real_id: sub.real_id, type: 'subcategory',
                        name: sub.name, x: sx, y: sy,
                        parent: cat.id, w: 160, h: 40,
                        color: '#0ea5e9',
                    };
                    newNodes.push(subNode);
                    newLinks.push({
                        id: `l-${cat.id}-${sub.id}`,
                        fromId: cat.id, toId: sub.id,
                        color: cat.color || '#0ea5e9',
                    });

                    const prods = sub.children || [];
                    const radiusProd = 150;
                    prods.forEach((prod, pi) => {
                        const a3 = a2 + ((pi - (prods.length - 1) / 2) * 0.3);
                        const px = sx + 80 + Math.cos(a3) * radiusProd - 70;
                        const py = sy + 20 + Math.sin(a3) * radiusProd - 18;

                        newNodes.push({
                            id: prod.id, real_id: prod.real_id, type: 'product',
                            name: prod.name,
                            price: prod.price, stock: prod.stock, unit: prod.unit,
                            x: px, y: py, parent: sub.id,
                            w: 140, h: 50, color: '#c084fc',
                        });
                        newLinks.push({
                            id: `l-${sub.id}-${prod.id}`,
                            fromId: sub.id, toId: prod.id,
                            color: '#c084fc',
                        });
                    });
                });
            });

            nodes.value = newNodes;
            recomputeLinks(newLinks);

            // Markaz ба root
            Vue.nextTick(() => reset());
        }

        function recomputeLinks(linkList) {
            const byId = new Map(nodes.value.map(n => [n.id, n]));
            const result = (linkList || links.value).map(l => {
                const a = byId.get(l.fromId);
                const b = byId.get(l.toId);
                if (!a || !b) return { ...l, d: '' };
                const x1 = a.x + (a.w || 160) / 2;
                const y1 = a.y + (a.h || 40) / 2;
                const x2 = b.x + (b.w || 160) / 2;
                const y2 = b.y + (b.h || 40) / 2;
                // Bezier curve бо дастаҳои x ва нисф ба самти y
                const dx = (x2 - x1) * 0.5;
                const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
                return { ...l, d };
            });
            links.value = result;
        }

        function getChildCount(parentId) {
            return nodes.value.filter(n => n.parent === parentId).length;
        }

        // Reset — markaz ба root
        function reset() {
            if (!wrap.value) return;
            const root = nodes.value.find(n => n.id === 'root');
            if (!root) return;
            const rect = wrap.value.getBoundingClientRect();
            viewportW.value = rect.width;
            viewportH.value = rect.height;
            pan.x = -root.x * zoom.value + rect.width / 2 - 90 * zoom.value;
            pan.y = -root.y * zoom.value + rect.height / 2 - 30 * zoom.value;
        }

        // ===== Wheel: Ctrl=zoom, oddi=scroll =====
        function onWheel(e) {
            const rect = wrap.value.getBoundingClientRect();
            if (e.ctrlKey || e.metaKey) {
                // Zoom around cursor
                const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
                const newZoom = Math.min(2.5, Math.max(0.3, zoom.value * factor));
                const cursorX = e.clientX - rect.left;
                const cursorY = e.clientY - rect.top;
                // Ҷои курсор дар координатаҳои канва
                const worldX = (cursorX - pan.x) / zoom.value;
                const worldY = (cursorY - pan.y) / zoom.value;
                zoom.value = newZoom;
                pan.x = cursorX - worldX * newZoom;
                pan.y = cursorY - worldY * newZoom;
            } else {
                // Scroll: ҳаракат ба ҷонибҳо
                if (e.shiftKey) {
                    pan.x -= e.deltaY;
                } else {
                    pan.x -= e.deltaX;
                    pan.y -= e.deltaY;
                }
            }
        }

        function zoomBy(delta) {
            const newZoom = Math.min(2.5, Math.max(0.3, zoom.value + delta));
            // Zoom бо marakaz
            const rect = wrap.value.getBoundingClientRect();
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            const worldX = (cx - pan.x) / zoom.value;
            const worldY = (cy - pan.y) / zoom.value;
            zoom.value = newZoom;
            pan.x = cx - worldX * newZoom;
            pan.y = cy - worldY * newZoom;
        }

        // ===== Pan =====
        function onCanvasDown(e) {
            if (drag.mode) return;
            drag.mode = 'canvas';
            drag.startX = e.clientX;
            drag.startY = e.clientY;
            drag.origX = pan.x;
            drag.origY = pan.y;
            wrap.value?.classList.add('grabbing');
        }

        function onCanvasMove(e) {
            if (drag.mode === 'canvas') {
                pan.x = drag.origX + (e.clientX - drag.startX);
                pan.y = drag.origY + (e.clientY - drag.startY);
            } else if (drag.mode === 'node' && drag.node) {
                const dx = (e.clientX - drag.startX) / zoom.value;
                const dy = (e.clientY - drag.startY) / zoom.value;
                drag.node.x = drag.origX + dx;
                drag.node.y = drag.origY + dy;
                recomputeLinks();
            }
        }

        function onCanvasUp() {
            drag.mode = null;
            drag.node = null;
            wrap.value?.classList.remove('grabbing');
        }

        // ===== Node drag =====
        function onNodeDown(e, node) {
            drag.mode = 'node';
            drag.startX = e.clientX;
            drag.startY = e.clientY;
            drag.origX = node.x;
            drag.origY = node.y;
            drag.node = node;
        }

        // ===== Touch support =====
        function onTouchStart(e) {
            if (e.touches.length === 1) {
                onCanvasDown({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
            }
        }
        function onTouchMove(e) {
            if (e.touches.length === 1) {
                onCanvasMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
            }
        }
        function onNodeTouch(e, node) {
            if (e.touches.length === 1) {
                onNodeDown({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }, node);
            }
        }

        // Обнавление вақте маълумот тағйир ёфт
        let off1, off2, off3, off4;
        Vue.onMounted(() => {
            load();
            off1 = window.EventBus?.on('data:categories', load);
            off2 = window.EventBus?.on('data:products', load);
            off3 = window.EventBus?.on('data:subcategories', load);
            // window resize
            const onResize = () => {
                if (!wrap.value) return;
                const r = wrap.value.getBoundingClientRect();
                viewportW.value = r.width;
                viewportH.value = r.height;
            };
            window.addEventListener('resize', onResize);
            off4 = () => window.removeEventListener('resize', onResize);
            Vue.nextTick(onResize);
        });
        Vue.onUnmounted(() => {
            off1 && off1(); off2 && off2(); off3 && off3(); off4 && off4();
        });

        return {
            tree, loading, search,
            wrap, zoom, pan, nodes, links,
            visibleNodes, hilite, canvasStyle, canvasW, canvasH,
            viewportW, viewportH, minimapScale,
            isMatch, getChildCount,
            load, autoLayout, reset, zoomBy,
            onWheel, onCanvasDown, onCanvasMove, onCanvasUp,
            onNodeDown, onTouchStart, onTouchMove, onNodeTouch,
            fmtMoney: window.fmtMoney,
        };
    },
};

// Stub barojai backwards compatibility
window.AppViews.MindMapNode = { template: '<div></div>' };
