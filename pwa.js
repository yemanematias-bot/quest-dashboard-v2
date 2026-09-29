(() => {
    const install = document.getElementById("install-app");
    const update = document.getElementById("update-app");
    const status = document.getElementById("pwa-status");
    let promptEvent = null;
    let registration = null;
    const installed = () => matchMedia("(display-mode: standalone)").matches;
    function connectionStatus() {
        if (!navigator.onLine) status.textContent = "Offline · Local quests still work. Cloud sync needs internet.";
        else if (installed()) status.textContent = "Installed · Long-press the app icon for Daily quests and Main quests shortcuts.";
    }
    if (installed()) install.hidden = true;
    connectionStatus();
    addEventListener("online", connectionStatus);
    addEventListener("offline", connectionStatus);
    addEventListener("beforeinstallprompt", event => {
        event.preventDefault(); promptEvent = event;
        install.hidden = false;
    });
    addEventListener("appinstalled", () => {
        promptEvent = null; install.hidden = true;
        status.textContent = "Installed! Open Quest Dashboard from your home screen.";
    });
    install.addEventListener("click", async () => {
        if (!promptEvent) {
            status.textContent = "In Chrome, open ⋮ → Install app or Add to home screen. If it is already installed, open it from your app list.";
            return;
        }
        try { await promptEvent.prompt(); await promptEvent.userChoice; }
        catch (_) { status.textContent = "Use Chrome's menu to install the app."; }
        promptEvent = null;
    });
    update.addEventListener("click", () => {
        if (!registration || !registration.waiting) return;
        saveData();
        registration.waiting.postMessage({type:"SKIP_WAITING"});
    });
    if ("serviceWorker" in navigator) {
        let refreshing = false;
        let applyingUpdate = false;
        update.addEventListener("click", () => { applyingUpdate = true; });
        navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (applyingUpdate && !refreshing) { refreshing = true; location.reload(); }
        });
        navigator.serviceWorker.register("./sw.js").then(reg => {
            registration = reg;
            if (reg.waiting) update.hidden = false;
            reg.addEventListener("updatefound", () => {
                const worker = reg.installing;
                worker.addEventListener("statechange", () => {
                    if (worker.state === "installed" && navigator.serviceWorker.controller) update.hidden = false;
                });
            });
        }).catch(() => { status.textContent = "Offline setup failed. Reload online to retry."; });
    }
    // Refresh daily completion states after midnight or returning to the app.
    let day = getToday();
    function refreshDay() {
        if (getToday() !== day) { day = getToday(); renderAll(); }
    }
    document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshDay(); });
    setInterval(refreshDay, 60000);
})();