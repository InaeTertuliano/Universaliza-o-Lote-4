/* ==========================================================================
   WEBGIS AUTHENTICATION & ACCESS CONTROL MODULE
   Universalização Sabesp & Engeform - Lote 4 Itapetininga
   ========================================================================== */

(function() {
    'use strict';

    // Multi-user configuration (Viewer vs Editor roles)
    const USERS = [
        {
            username: 'lote4',
            password: 'lote4',
            userHash: '791180c8801b55ba578fc5b9cbdc7cb4cb67d952d3b4fc1b0ef33e71e71c3cc1',
            passHash: '791180c8801b55ba578fc5b9cbdc7cb4cb67d952d3b4fc1b0ef33e71e71c3cc1',
            role: 'viewer',
            label: 'Visualizador'
        },
        {
            username: 'lote4ed',
            password: 'lote4ed',
            userHash: '0c34788f0318544b49eb02bbe323c0548cee442869ebae370645d4eca91f5a5e',
            passHash: '0c34788f0318544b49eb02bbe323c0548cee442869ebae370645d4eca91f5a5e',
            role: 'editor',
            label: 'Editor'
        }
    ];

    const STORAGE_KEY = 'sabesp_lote4_auth_token';
    const STORAGE_USER_KEY = 'sabesp_lote4_auth_user';
    const STORAGE_ROLE_KEY = 'sabesp_lote4_auth_role';
    const AUTH_SUCCESS_VALUE = 'authenticated_lote4_sec';

    // Fast SHA-256 digest using Browser Crypto API
    async function hashString(str) {
        try {
            if (window.crypto && window.crypto.subtle) {
                const msgBuffer = new TextEncoder().encode(str);
                const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            }
        } catch (e) {
            console.warn("Crypto API fallback", e);
        }
        return null;
    }

    function isAlreadyAuthenticated() {
        return (
            localStorage.getItem(STORAGE_KEY) === AUTH_SUCCESS_VALUE ||
            sessionStorage.getItem(STORAGE_KEY) === AUTH_SUCCESS_VALUE
        );
    }

    function updateAuthBadge() {
        const userLabel = document.getElementById('auth-user-label');
        const userIcon = document.getElementById('auth-user-icon');
        const role = localStorage.getItem(STORAGE_ROLE_KEY) || sessionStorage.getItem(STORAGE_ROLE_KEY) || 'viewer';
        const user = localStorage.getItem(STORAGE_USER_KEY) || sessionStorage.getItem(STORAGE_USER_KEY) || 'lote4';

        if (userLabel) {
            if (role === 'editor') {
                userLabel.innerHTML = `<strong>${user}</strong> <span style="background: rgba(245, 158, 11, 0.25); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.5); padding: 1px 6px; border-radius: 4px; font-size: 0.68rem; margin-left: 4px; font-weight:700;">Editor</span>`;
            } else {
                userLabel.innerHTML = `<strong>${user}</strong> <span style="background: rgba(2, 132, 199, 0.2); color: #38bdf8; border: 1px solid rgba(2, 132, 199, 0.4); padding: 1px 6px; border-radius: 4px; font-size: 0.68rem; margin-left: 4px; font-weight:700;">Visualizador</span>`;
            }
        }
        if (userIcon) {
            userIcon.className = (role === 'editor') ? 'fas fa-user-shield' : 'fas fa-user-circle';
            userIcon.style.color = (role === 'editor') ? '#f59e0b' : '#38bdf8';
        }
    }

    function unlockPortal() {
        const overlay = document.getElementById('auth-overlay');
        document.body.classList.remove('auth-locked');
        if (overlay) {
            overlay.classList.add('auth-fade-out');
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 300);
        }

        updateAuthBadge();

        // If map exists, refresh size
        if (window.GIS_MAP) {
            setTimeout(() => {
                window.GIS_MAP.invalidateSize();
            }, 350);
        }
    }

    function lockPortal() {
        document.body.classList.add('auth-locked');
        const overlay = document.getElementById('auth-overlay');
        if (overlay) {
            overlay.classList.remove('auth-fade-out');
            overlay.style.display = 'flex';
        }
    }

    function logout() {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_USER_KEY);
        localStorage.removeItem(STORAGE_ROLE_KEY);
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(STORAGE_USER_KEY);
        sessionStorage.removeItem(STORAGE_ROLE_KEY);
        window.location.reload();
    }

    // Initialize Auth Gate immediately
    function init() {
        if (isAlreadyAuthenticated()) {
            unlockPortal();
        } else {
            lockPortal();
        }

        // Bind DOM elements when ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bindEvents);
        } else {
            bindEvents();
        }
    }

    function bindEvents() {
        const form = document.getElementById('auth-form');
        const userInput = document.getElementById('auth-username');
        const passInput = document.getElementById('auth-password');
        const errorMsg = document.getElementById('auth-error-msg');
        const errorText = document.getElementById('auth-error-text');
        const rememberChk = document.getElementById('auth-remember');
        const btnSubmit = document.getElementById('btn-auth-submit');
        const btnText = document.getElementById('btn-auth-text');
        const btnSpinner = document.getElementById('btn-auth-spinner');
        const togglePwd = document.getElementById('auth-toggle-pwd');
        const btnLogout = document.getElementById('btn-logout');

        // Logout button
        if (btnLogout) {
            btnLogout.addEventListener('click', function(e) {
                e.preventDefault();
                if (confirm("Deseja realmente sair do portal WebGIS?")) {
                    logout();
                }
            });
        }

        // Toggle password visibility
        if (togglePwd && passInput) {
            togglePwd.addEventListener('click', function() {
                const isPassword = passInput.getAttribute('type') === 'password';
                passInput.setAttribute('type', isPassword ? 'text' : 'password');
                const icon = togglePwd.querySelector('i');
                if (icon) {
                    icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
                }
            });
        }

        // Submit form
        if (form) {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                await handleLogin();
            });
        }

        if (btnSubmit) {
            btnSubmit.addEventListener('click', async function(e) {
                e.preventDefault();
                await handleLogin();
            });
        }

        async function handleLogin() {
            if (!userInput || !passInput) return;

            const u = userInput.value.trim();
            const p = passInput.value.trim();

            if (!u || !p) {
                showError("Por favor, preencha o usuário e a senha.");
                return;
            }

            // Show loading state
            if (btnText && btnSpinner) {
                btnText.style.display = 'none';
                btnSpinner.style.display = 'inline-block';
            }
            if (btnSubmit) btnSubmit.disabled = true;

            const uHash = await hashString(u);
            const pHash = await hashString(p);

            // Find matching user from USERS array
            const matchedUser = USERS.find(user => {
                const uMatch = (uHash === user.userHash) || (u.toLowerCase() === user.username.toLowerCase());
                const pMatch = (pHash === user.passHash) || (p === user.password);
                return uMatch && pMatch;
            });

            // Small delay for smooth feedback
            await new Promise(r => setTimeout(r, 350));

            if (matchedUser) {
                // Success!
                hideError();

                const remember = rememberChk ? rememberChk.checked : true;
                const storage = remember ? localStorage : sessionStorage;
                storage.setItem(STORAGE_KEY, AUTH_SUCCESS_VALUE);
                storage.setItem(STORAGE_USER_KEY, matchedUser.username);
                storage.setItem(STORAGE_ROLE_KEY, matchedUser.role);

                unlockPortal();
            } else {
                // Failure!
                showError("Usuário ou senha incorretos. Tente novamente.");
                const card = document.querySelector('.auth-card');
                if (card) {
                    card.classList.remove('auth-shake');
                    void card.offsetWidth; // retrigger CSS animation
                    card.classList.add('auth-shake');
                }
                passInput.value = '';
                passInput.focus();
            }

            // Restore button state
            if (btnText && btnSpinner) {
                btnText.style.display = 'inline-block';
                btnSpinner.style.display = 'none';
            }
            if (btnSubmit) btnSubmit.disabled = false;
        }

        function showError(msg) {
            if (errorMsg && errorText) {
                errorText.textContent = msg;
                errorMsg.style.display = 'flex';
            }
        }

        function hideError() {
            if (errorMsg) {
                errorMsg.style.display = 'none';
            }
        }
    }

    // Run immediately to guard against flash of unauthenticated content
    init();

    // Export module for global use if needed
    window.GIS_AUTH = {
        logout: logout,
        isAuth: isAlreadyAuthenticated,
        getUserRole: function() {
            return localStorage.getItem(STORAGE_ROLE_KEY) || sessionStorage.getItem(STORAGE_ROLE_KEY) || 'viewer';
        },
        getUsername: function() {
            return localStorage.getItem(STORAGE_USER_KEY) || sessionStorage.getItem(STORAGE_USER_KEY) || 'lote4';
        },
        isEditor: function() {
            return this.getUserRole() === 'editor';
        },
        updateBadge: updateAuthBadge
    };

})();
