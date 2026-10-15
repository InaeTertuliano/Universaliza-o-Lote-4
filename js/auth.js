/* ==========================================================================
   WEBGIS AUTHENTICATION & ACCESS CONTROL MODULE
   Universalização Sabesp & Engeform - Lote 4 Itapetininga
   ========================================================================== */

(function() {
    'use strict';

    // Hash SHA-256 for 'lote4'
    const VALID_USER_HASH = '791180c8801b55ba578fc5b9cbdc7cb4cb67d952d3b4fc1b0ef33e71e71c3cc1';
    const VALID_PASS_HASH = '791180c8801b55ba578fc5b9cbdc7cb4cb67d952d3b4fc1b0ef33e71e71c3cc1';

    const STORAGE_KEY = 'sabesp_lote4_auth_token';
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

    function unlockPortal() {
        const overlay = document.getElementById('auth-overlay');
        document.body.classList.remove('auth-locked');
        if (overlay) {
            overlay.classList.add('auth-fade-out');
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 300);
        }

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
        sessionStorage.removeItem(STORAGE_KEY);
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

            // Valid if SHA matches or direct match (lote4 / lote4)
            const isValidUser = (uHash === VALID_USER_HASH) || (u.toLowerCase() === 'lote4');
            const isValidPass = (pHash === VALID_PASS_HASH) || (p === 'lote4');

            // Small delay for smooth feedback
            await new Promise(r => setTimeout(r, 350));

            if (isValidUser && isValidPass) {
                // Success!
                hideError();

                const remember = rememberChk ? rememberChk.checked : true;
                if (remember) {
                    localStorage.setItem(STORAGE_KEY, AUTH_SUCCESS_VALUE);
                } else {
                    sessionStorage.setItem(STORAGE_KEY, AUTH_SUCCESS_VALUE);
                }

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
        isAuth: isAlreadyAuthenticated
    };

})();
