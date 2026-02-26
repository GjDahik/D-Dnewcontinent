// ==================== FIREBASE (solo para index.html / login) ====================
// Requiere firebase-config.js antes de este script. dm-dashboard y player-app usan app.js.
(function () {
    if (typeof firebase === 'undefined') return;
    if (firebase.apps && firebase.apps.length > 0) return;
    var conf = (typeof window !== 'undefined' && window.firebaseConfig) ? window.firebaseConfig : {
        apiKey: "__REPLACE_API_KEY__",
        authDomain: "nueva-valdoria.firebaseapp.com",
        projectId: "nueva-valdoria",
        storageBucket: "nueva-valdoria.firebasestorage.app",
        messagingSenderId: "29742426810",
        appId: "1:29742426810:web:0cf259ba71b0e5f0d8f083"
    };
    if (!conf.apiKey || conf.apiKey === "__REPLACE_API_KEY__") return;
    firebase.initializeApp(conf);
    window.db = firebase.firestore();
    // Primero autenticar, después leer Firestore. Si no hay user, signInAnonymously y volver a entrar en onAuthStateChanged.
    if (typeof firebase.auth === 'function') {
        window.__authReadyPromise = new Promise(function (resolve) { window.__resolveAuthReady = resolve; });
        firebase.auth().onAuthStateChanged(async function (user) {
            if (!user) {
                try { await firebase.auth().signInAnonymously(); } catch (e) { console.warn('[Auth]', e.message); if (typeof window.__resolveAuthReady === 'function') { window.__resolveAuthReady(); window.__resolveAuthReady = null; } }
                return;
            }
            if (typeof window.__resolveAuthReady === 'function') { window.__resolveAuthReady(); window.__resolveAuthReady = null; }
        });
    } else {
        window.__authReadyPromise = Promise.resolve();
    }
})();
