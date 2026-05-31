/* AliStroy CRM — Authentication module
   Кор аз пешбози Vue mount: тафтиш мекунад токен, ё login form-ро нишон медиҳад.
*/
window.AuthModule = (function () {
    function showLoginScreen(errorMsg) {
        const root = document.getElementById('app');
        root.innerHTML = `
            <div class="login-page">
                <div class="login-bg-grid"></div>
                <div class="login-card">
                    <div class="login-logo">
                        <div class="login-logo-mark">
                            <svg viewBox="0 0 32 32" width="32" height="32">
                                <rect width="32" height="32" rx="8" fill="white"/>
                                <path d="M9 22V11l7-4 7 4v11M13 22v-7h6v7"
                                    stroke="#16a34a" stroke-width="2.5"
                                    fill="none" stroke-linecap="round"
                                    stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <div>
                            <div class="login-logo-title">AliStroy CRM</div>
                            <div class="login-logo-sub">Склади маҳсулоти сохтмонӣ</div>
                        </div>
                    </div>

                    <h2 class="login-title">Хуш омадед!</h2>
                    <p class="login-text">Барои идома логин ва пароли худро ворид кунед.</p>

                    <form id="login-form" class="login-form" autocomplete="on">
                        <div class="form-group">
                            <label class="form-label">Логин</label>
                            <div class="login-input-wrap">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" stroke-width="2"
                                    stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                </svg>
                                <input type="text" id="login-username"
                                    class="form-input" placeholder="admin"
                                    autocomplete="username" required autofocus />
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Парол</label>
                            <div class="login-input-wrap">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" stroke-width="2"
                                    stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                                <input type="password" id="login-password"
                                    class="form-input" placeholder="••••••••"
                                    autocomplete="current-password" required />
                                <button type="button" id="toggle-pw" class="login-eye" tabindex="-1">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" stroke-width="2"
                                        stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                        <circle cx="12" cy="12" r="3"/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div id="login-error" class="login-error"
                            style="${errorMsg ? '' : 'display:none'}">
                            ${errorMsg || ''}
                        </div>

                        <button type="submit" class="btn btn-primary login-submit"
                            id="login-submit">
                            Ворид шудан
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" stroke-width="2"
                                stroke-linecap="round" stroke-linejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12"/>
                                <polyline points="12 5 19 12 12 19"/>
                            </svg>
                        </button>
                    </form>

                    <div class="login-footer">
                        AliStroy CRM v1.1 · 2026
                    </div>
                </div>
            </div>
        `;

        const form = document.getElementById('login-form');
        const submit = document.getElementById('login-submit');
        const errorBox = document.getElementById('login-error');
        const togglePw = document.getElementById('toggle-pw');
        const pwInput = document.getElementById('login-password');

        togglePw.addEventListener('click', () => {
            pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value.trim();
            const password = pwInput.value;

            errorBox.style.display = 'none';
            submit.disabled = true;
            submit.innerHTML = '<span class="login-spinner"></span> Санҷиш...';

            try {
                const r = await window.API.auth.login(username, password);
                window.API.token.set(r.token);
                // Mount Vue app
                bootApp();
            } catch (err) {
                errorBox.textContent = err.message || 'Хатогии номаълум';
                errorBox.style.display = 'block';
                submit.disabled = false;
                submit.innerHTML = `Ворид шудан
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="12 5 19 12 12 19"/>
                    </svg>`;
            }
        });
    }

    async function bootApp() {
        // Зеҳни нависистема — Vue app
        if (window.bootVueApp) {
            window.bootVueApp();
        } else {
            // Барои сервер reload (агар lazy bootstrapping буда бошад)
            location.reload();
        }
    }

    async function init() {
        // Реакция ба 401-и umumi
        window.addEventListener('auth:logout', () => {
            window.API.token.set('');
            showLoginScreen('Сессия ба охир расид. Аз нав ворид шавед.');
        });

        const token = window.API.token.get();
        if (!token) {
            showLoginScreen();
            return;
        }
        // Тафтиши токен
        try {
            await window.API.auth.me();
            bootApp();
        } catch (e) {
            window.API.token.set('');
            showLoginScreen();
        }
    }

    return { init, showLoginScreen, bootApp };
})();
