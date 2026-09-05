// Quest Dashboard V3 cloud accounts and synchronization.
// Local storage remains active as an offline and recovery layer.

(function () {
    "use strict";

    const config = window.QUEST_CLOUD_CONFIG || {};
    const statusElement = document.getElementById("cloud-status");
    const systemStatus = document.getElementById("system-status");
    const signedOutControls = document.getElementById("auth-signed-out");
    const signedInControls = document.getElementById("auth-signed-in");
    const emailInput = document.getElementById("auth-email");
    const passwordInput = document.getElementById("auth-password");
    const accountEmail = document.getElementById("account-email");
    const signInButton = document.getElementById("sign-in");
    const signUpButton = document.getElementById("sign-up");
    const signOutButton = document.getElementById("sign-out");
    const syncButton = document.getElementById("sync-now");

    const OWNER_KEY = "questCloudOwner";
    const DIRTY_KEY = "questCloudDirty";
    let client = null;
    let currentUser = null;
    let syncTimer = null;
    let cloudReady = false;
    let applyingCloud = false;

    function setStatus(message, state = "local") {
        statusElement.textContent = message;

        if (state === "synced") {
            systemStatus.textContent = "System Online · Cloud Synced";
        }
        else if (state === "syncing") {
            systemStatus.textContent = "System Online · Syncing";
        }
        else {
            systemStatus.textContent = "System Online · Local Mode";
        }
    }

    function getSnapshot() {
        return {
            version: STORAGE_VERSION,
            savedAt: new Date().toISOString(),
            player: player,
            mainQuests: mainQuests,
            sideQuests: sideQuests,
            dailyQuests: dailyQuests,
            weeklyQuests: weeklyQuests,
            questHistory: questHistory,
            achievements: achievements
        };
    }

    function comparableSave(save) {
        if (!save) return null;

        return {
            player: save.player,
            mainQuests: save.mainQuests,
            sideQuests: save.sideQuests,
            dailyQuests: save.dailyQuests,
            weeklyQuests: save.weeklyQuests,
            questHistory: save.questHistory,
            achievements: save.achievements
        };
    }

    function savesMatch(left, right) {
        return JSON.stringify(comparableSave(left)) ===
            JSON.stringify(comparableSave(right));
    }

    function showSignedOut() {
        signedOutControls.hidden = false;
        signedInControls.hidden = true;
        accountEmail.textContent = "";
        currentUser = null;
        cloudReady = false;
        setStatus("Sign in to sync between devices.");
    }

    function showSignedIn(user) {
        signedOutControls.hidden = true;
        signedInControls.hidden = false;
        accountEmail.textContent = user.email || "Signed in";
    }

    async function uploadLocalSave(options = {}) {
        if (!currentUser) return false;

        setStatus("Saving to cloud…", "syncing");

        const snapshot = getSnapshot();
        const result = await client
            .from("quest_saves")
            .upsert({
                user_id: currentUser.id,
                data: snapshot,
                updated_at: snapshot.savedAt
            }, {
                onConflict: "user_id"
            });

        if (result.error) {
            console.error("Cloud save failed:", result.error);
            localStorage.setItem(DIRTY_KEY, "1");
            setStatus("Offline—changes remain safe on this device.");
            return false;
        }

        localStorage.setItem(OWNER_KEY, currentUser.id);
        localStorage.removeItem(DIRTY_KEY);
        setStatus(options.manual ? "Sync complete." : "Cloud saved.", "synced");
        return true;
    }

    function restoreCloudSave(cloudSave) {
        const current = localStorage.getItem(STORAGE_KEY);

        if (current) {
            localStorage.setItem(BACKUP_KEY, current);
        }

        applyingCloud = true;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudSave));
        localStorage.setItem(OWNER_KEY, currentUser.id);
        localStorage.removeItem(DIRTY_KEY);
        location.reload();
    }

    async function reconcileSaves() {
        if (!currentUser) return;

        setStatus("Checking cloud save…", "syncing");

        const result = await client
            .from("quest_saves")
            .select("data, updated_at")
            .eq("user_id", currentUser.id)
            .maybeSingle();

        if (result.error) {
            console.error("Cloud load failed:", result.error);
            setStatus("Cloud unavailable—using safe local data.");
            cloudReady = true;
            return;
        }

        const localSave = getSnapshot();
        const cloudSave = result.data && result.data.data;
        const previousOwner = localStorage.getItem(OWNER_KEY);
        const isDirty = localStorage.getItem(DIRTY_KEY) === "1";

        if (!cloudSave) {
            cloudReady = true;
            await uploadLocalSave();
            return;
        }

        if (savesMatch(localSave, cloudSave)) {
            localStorage.setItem(OWNER_KEY, currentUser.id);
            localStorage.removeItem(DIRTY_KEY);
            cloudReady = true;
            setStatus("Cloud synced.", "synced");
            return;
        }

        if (previousOwner === currentUser.id && isDirty) {
            cloudReady = true;
            await uploadLocalSave();
            return;
        }

        if (previousOwner !== currentUser.id && hasProgress(localSave)) {
            const useCloud = confirm(
                "This device and your cloud account both contain progress.\n\n" +
                "Press OK to use the CLOUD save.\n" +
                "Press Cancel to keep THIS DEVICE and upload it."
            );

            if (!useCloud) {
                cloudReady = true;
                await uploadLocalSave();
                return;
            }
        }

        restoreCloudSave(cloudSave);
    }

    function scheduleCloudSave() {
        if (!cloudReady || !currentUser || applyingCloud) return;

        localStorage.setItem(DIRTY_KEY, "1");
        clearTimeout(syncTimer);
        setStatus("Change queued for sync…", "syncing");

        syncTimer = setTimeout(function () {
            uploadLocalSave();
        }, 700);
    }

    async function signIn() {
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            setStatus("Enter your email and password.");
            return;
        }

        setStatus("Signing in…", "syncing");
        const result = await client.auth.signInWithPassword({ email, password });

        if (result.error) {
            setStatus(result.error.message);
            return;
        }

        passwordInput.value = "";
    }

    async function signUp() {
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || password.length < 8) {
            setStatus("Use a valid email and a password of at least 8 characters.");
            return;
        }

        setStatus("Creating account…", "syncing");
        const result = await client.auth.signUp({ email, password });

        if (result.error) {
            setStatus(result.error.message);
            return;
        }

        passwordInput.value = "";

        if (!result.data.session) {
            setStatus("Account created—check your email, confirm it, then sign in.");
        }
    }

    async function signOut() {
        setStatus("Signing out…", "syncing");
        const result = await client.auth.signOut();

        if (result.error) {
            setStatus(result.error.message);
        }
    }

    async function handleSession(session) {
        if (!session || !session.user) {
            showSignedOut();
            return;
        }

        currentUser = session.user;
        showSignedIn(currentUser);
        await reconcileSaves();
    }

    async function initializeCloud() {
        if (!window.supabase || !config.url || !config.publishableKey) {
            setStatus("Cloud configuration is missing.");
            return;
        }

        client = window.supabase.createClient(config.url, config.publishableKey);

        signInButton.addEventListener("click", signIn);
        signUpButton.addEventListener("click", signUp);
        signOutButton.addEventListener("click", signOut);
        syncButton.addEventListener("click", function () {
            uploadLocalSave({ manual: true });
        });
        passwordInput.addEventListener("keydown", function (event) {
            if (event.key === "Enter") signIn();
        });
        window.addEventListener("quest-local-save", scheduleCloudSave);

        client.auth.onAuthStateChange(function (_event, session) {
            setTimeout(function () {
                handleSession(session);
            }, 0);
        });

        const sessionResult = await client.auth.getSession();

        if (sessionResult.error) {
            setStatus("Cloud session unavailable—local mode active.");
            return;
        }

        await handleSession(sessionResult.data.session);
    }

    initializeCloud();
})();
