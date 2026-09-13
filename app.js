// ========================================
// ELEMENTS
// ========================================

const addMainQuestButton = document.getElementById("add-main-quest");
const addSideQuestButton = document.getElementById("add-side-quest");
const addDailyQuestButton = document.getElementById("add-daily-quest");
const addWeeklyQuestButton = document.getElementById("add-weekly-quest");
const questDialog = document.getElementById("quest-dialog");
const questForm = document.getElementById("quest-form");
const questDialogTitle = document.getElementById("quest-dialog-title");
const questNameInput = document.getElementById("quest-name");
const questDifficultyInput = document.getElementById("quest-difficulty");
const questXPInput = document.getElementById("quest-xp");
const questCategoryInput = document.getElementById("quest-category");
const questTargetInput = document.getElementById("quest-target");
const questDailyLinkInput = document.getElementById("quest-daily-link");
const difficultyField = document.getElementById("difficulty-field");
const xpField = document.getElementById("xp-field");
const targetField = document.getElementById("target-field");
const dailyLinkField = document.getElementById("daily-link-field");
const questFormError = document.getElementById("quest-form-error");
let questDialogType = "main";
let editingQuest = null;
const clearHistoryButton = document.getElementById("clear-history");

const mainQuestList = document.getElementById("main-quest-list");
const sideQuestList = document.getElementById("side-quest-list");
const dailyQuestList = document.getElementById("daily-quest-list");
const weeklyQuestList = document.getElementById("weekly-quest-list");
const historyList = document.getElementById("history-list");
const achievementList = document.getElementById("achievement-list");


// ========================================
// PLAYER
// ========================================

const STORAGE_KEY = "questDashboardV2";
const BACKUP_KEY = "questDashboardV2Backup";
const STORAGE_VERSION = 2;

function safeParse(value, fallback = null) {
    if (!value) return fallback;

    try {
        return JSON.parse(value);
    }
    catch (error) {
        console.warn("Quest Dashboard: damaged saved data was ignored.", error);
        return fallback;
    }
}

function readLegacyData() {
    return {
        version: 1,
        player: safeParse(localStorage.getItem("player"), {}),
        mainQuests: safeParse(localStorage.getItem("mainQuests"), []),
        sideQuests: safeParse(localStorage.getItem("sideQuests"), []),
        dailyQuests: safeParse(localStorage.getItem("dailyQuests"), []),
        weeklyQuests: safeParse(localStorage.getItem("weeklyQuests"), []),
        questHistory: safeParse(localStorage.getItem("questHistory"), []),
        achievements: safeParse(localStorage.getItem("achievements"), [])
    };
}

function isValidSave(data) {
    return data &&
        typeof data === "object" &&
        data.player &&
        typeof data.player === "object" &&
        [
            "mainQuests",
            "sideQuests",
            "dailyQuests",
            "weeklyQuests",
            "questHistory",
            "achievements"
        ].every(function (key) {
            return Array.isArray(data[key]);
        });
}

function hasProgress(data) {
    return isValidSave(data) && (
        Number(data.player.xp) > 0 ||
        Number(data.player.questsDone) > 0 ||
        data.mainQuests.length > 0 ||
        data.sideQuests.length > 0 ||
        data.dailyQuests.length > 0 ||
        data.weeklyQuests.length > 0 ||
        data.questHistory.length > 0 ||
        data.achievements.length > 0
    );
}

function loadSavedData() {
    const current = safeParse(localStorage.getItem(STORAGE_KEY));
    const backup = safeParse(localStorage.getItem(BACKUP_KEY));

    if (isValidSave(current)) {
        if (!hasProgress(current) && hasProgress(backup)) {
            console.warn("Quest Dashboard: empty save rejected; recovery copy restored.");
            return backup;
        }

        return current;
    }

    if (isValidSave(backup)) {
        console.warn("Quest Dashboard: restored the last-known-good backup.");
        return backup;
    }

    return readLegacyData();
}

const savedData = loadSavedData();

let player = savedData.player || {};

if (player.xp === undefined) player.xp = 0;
if (player.questsDone === undefined) player.questsDone = 0;

if (!player.stats) {
    player.stats = {
        strength: 0,
        knowledge: 0,
        wealth: 0,
        discipline: 0
    };
}


// ========================================
// DATA
// ========================================

let mainQuests = savedData.mainQuests || [];

let sideQuests = savedData.sideQuests || [];

let dailyQuests = savedData.dailyQuests || [];

let weeklyQuests = savedData.weeklyQuests || [];

let questHistory = savedData.questHistory || [];

let achievements = savedData.achievements || [];


// ========================================
// UTILITIES
// ========================================

function makeId() {
    return Date.now().toString(36) +
        Math.random().toString(36).slice(2, 9);
}


function normalizeCategory(category) {

    const value =
        String(category || "")
            .trim()
            .toLowerCase();

    const allowed = [
        "strength",
        "knowledge",
        "wealth",
        "discipline",
        "general"
    ];

    if (allowed.includes(value)) {
        return value;
    }

    return "general";
}





function categoryIcon(category) {

    const icons = {
        strength: "💪",
        knowledge: "🧠",
        wealth: "💰",
        discipline: "⚡",
        general: "⭐"
    };

    return icons[category] || "⭐";
}


function categoryName(category) {

    return category
        .charAt(0)
        .toUpperCase() +
        category.slice(1);
}


// ========================================
// OLD DATA CONVERSION
// ========================================

mainQuests = mainQuests.map(function (quest) {

    if (typeof quest === "string") {

        return {
            name: quest,
            difficulty: "Medium",
            xp: 250,
            category: "general"
        };
    }

    if (!quest.category) {
        quest.category = "general";
    }

    return quest;
});


sideQuests = sideQuests.map(function (quest) {

    if (!quest.category) {
        quest.category = "general";
    }

    return quest;
});


dailyQuests = dailyQuests.map(function (quest) {

    if (typeof quest === "string") {

        return {
            id: makeId(),
            name: quest,
            xp: 30,
            lastCompleted: null,
            streak: 0,
            category: "discipline"
        };
    }

    if (!quest.id) quest.id = makeId();

    if (quest.lastCompleted === undefined) {
        quest.lastCompleted = null;
    }

    if (quest.streak === undefined) {
        quest.streak = 0;
    }

    if (!quest.category) {
        quest.category = "discipline";
    }

    delete quest.completed;

    return quest;
});


weeklyQuests = weeklyQuests.map(function (quest) {

    if (quest.linkedDailyId === undefined) {
        quest.linkedDailyId = null;
    }

    if (!quest.category) {
        quest.category = "discipline";
    }

    return quest;
});


// ========================================
// DATE
// ========================================

function getDateString(date = new Date()) {

    const year = date.getFullYear();

    const month =
        String(date.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(date.getDate())
            .padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function getToday() {
    return getDateString(new Date());
}


function getYesterday() {

    const yesterday = new Date();

    yesterday.setDate(
        yesterday.getDate() - 1
    );

    return getDateString(yesterday);
}


// ========================================
// SAVE
// ========================================

function saveData() {

    const snapshot = {
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

    const previous = safeParse(localStorage.getItem(STORAGE_KEY));

    // Never replace a useful recovery copy with an empty or broken save.
    if (hasProgress(previous)) {
        localStorage.setItem(BACKUP_KEY, JSON.stringify(previous));
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));

    localStorage.setItem(
        "player",
        JSON.stringify(player)
    );

    localStorage.setItem(
        "mainQuests",
        JSON.stringify(mainQuests)
    );

    localStorage.setItem(
        "sideQuests",
        JSON.stringify(sideQuests)
    );

    localStorage.setItem(
        "dailyQuests",
        JSON.stringify(dailyQuests)
    );

    localStorage.setItem(
        "weeklyQuests",
        JSON.stringify(weeklyQuests)
    );

    localStorage.setItem(
        "questHistory",
        JSON.stringify(questHistory)
    );

    localStorage.setItem(
        "achievements",
        JSON.stringify(achievements)
    );

    window.dispatchEvent(
        new CustomEvent("quest-local-save", {
            detail: snapshot
        })
    );
}


// ========================================
// BACKUP / RESTORE
// ========================================

function exportBackup() {
    saveData();

    const data = localStorage.getItem(STORAGE_KEY);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `quest-dashboard-backup-${getToday()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function importBackup() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";

    input.addEventListener("change", function () {
        const file = input.files && input.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.addEventListener("load", function () {
            const imported = safeParse(reader.result);

            if (!isValidSave(imported)) {
                alert("That file is not a valid Quest Dashboard backup.");
                return;
            }

            if (!confirm("Restore this backup? Your current data will be kept as a recovery copy.")) {
                return;
            }

            const current = safeParse(localStorage.getItem(STORAGE_KEY));
            if (isValidSave(current)) {
                localStorage.setItem(BACKUP_KEY, JSON.stringify(current));
            }

            localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
            location.reload();
        });

        reader.readAsText(file);
    });

    input.click();
}

function addBackupButtons() {
    if (!clearHistoryButton) return;

    const container = clearHistoryButton.parentElement;
    let exportButton = document.getElementById("export-backup");
    let importButton = document.getElementById("import-backup");

    if (!exportButton) {
        exportButton = document.createElement("button");
        exportButton.id = "export-backup";
        exportButton.textContent = "EXPORT BACKUP";
        container.appendChild(exportButton);
    }

    if (!importButton) {
        importButton = document.createElement("button");
        importButton.id = "import-backup";
        importButton.textContent = "IMPORT BACKUP";
        container.appendChild(importButton);
    }

    exportButton.addEventListener("click", exportBackup);
    importButton.addEventListener("click", importBackup);
}


// ========================================
// LEVEL + TITLE
// ========================================

function getLevel() {
    return Math.floor(player.xp / 1000) + 1;
}


function getCurrentLevelXP() {
    return player.xp % 1000;
}


function getTitle() {

    const level = getLevel();

    if (level >= 50) return "LEGEND";
    if (level >= 20) return "MASTER";
    if (level >= 10) return "ELITE";
    if (level >= 5) return "VANGUARD";
    if (level >= 3) return "ADVENTURER";
    if (level >= 2) return "INITIATE";

    return "NOVICE";
}


// ========================================
// STATS
// ========================================

function awardStat(category, amount = 1) {

    category = normalizeCategory(category);

    if (category === "general") {
        return;
    }

    player.stats[category] += amount;
}


function getStatReward(quest) {

    // Main quests scale with difficulty
    if (quest.difficulty) {

        const rewards = {
            easy: 1,
            medium: 2,
            hard: 4,
            boss: 8
        };

        return rewards[
            quest.difficulty.toLowerCase()
        ] || 1;
    }

    // Weekly quests are bigger accomplishments
    if (quest.target !== undefined) {
        return 3;
    }

    // Daily and Side quests
    return 1;
}


// ========================================
// CHARACTER
// ========================================

function updateCharacter() {

    const level =
        getLevel();

    const currentXP =
        getCurrentLevelXP();


    document.getElementById(
        "top-level"
    ).textContent =
        String(level).padStart(2, "0");


    document.getElementById(
        "xp-text"
    ).textContent =
        `${currentXP} / 1000`;


    document.querySelector(
        ".xp-fill"
    ).style.width =
        `${(currentXP / 1000) * 100}%`;


    document.getElementById(
        "character-level"
    ).textContent =
        level;


    document.getElementById(
        "character-title"
    ).textContent =
        getTitle();


    document.getElementById(
        "character-xp"
    ).textContent =
        player.xp;


    document.getElementById(
        "character-quests"
    ).textContent =
        player.questsDone;


    document.getElementById(
        "stat-strength"
    ).textContent =
        player.stats.strength;


    document.getElementById(
        "stat-knowledge"
    ).textContent =
        player.stats.knowledge;


    document.getElementById(
        "stat-wealth"
    ).textContent =
        player.stats.wealth;


    document.getElementById(
        "stat-discipline"
    ).textContent =
        player.stats.discipline;
}


// ========================================
// HISTORY
// ========================================

function addToHistory(
    quest,
    type
) {

    const now =
        new Date();


    questHistory.unshift({

        name:
            quest.name,

        xp:
            quest.xp,

        type:
            type,

        category:
            quest.category || "general",

        date:
            now.toLocaleDateString(),

        time:
            now.toLocaleTimeString(
                [],
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            )

    });


    if (
        questHistory.length > 30
    ) {

        questHistory =
            questHistory.slice(
                0,
                30
            );
    }
}


// ========================================
// MAIN XP
// ========================================

const mainXPRewards = {

    easy: 100,
    medium: 250,
    hard: 500,
    boss: 1000

};


// ========================================
// DAILY/WEEKLY LINK SYSTEM
// ========================================

function getDailyQuestById(id) {

    return dailyQuests.find(
        function (quest) {

            return quest.id === id;
        }
    );
}











function advanceLinkedWeeklyQuests(
    dailyQuestId
) {

    weeklyQuests.forEach(
        function (weeklyQuest) {

            if (
                weeklyQuest.linkedDailyId
                    === dailyQuestId
                &&
                weeklyQuest.progress
                    < weeklyQuest.target
            ) {

                weeklyQuest.progress += 1;
            }
        }
    );
}


// ========================================
// ACHIEVEMENTS
// ========================================

const achievementDefinitions = [

    {
        id: "first-blood",
        name: "First Blood",
        description:
            "Complete your first quest.",
        icon: "⚔️",

        unlocked: function () {
            return player.questsDone >= 1;
        }
    },

    {
        id: "quest-hunter",
        name: "Quest Hunter",
        description:
            "Complete 10 quests.",
        icon: "🎯",

        unlocked: function () {
            return player.questsDone >= 10;
        }
    },

    {
        id: "level-grinder",
        name: "Level Grinder",
        description:
            "Reach Level 3.",
        icon: "📈",

        unlocked: function () {
            return getLevel() >= 3;
        }
    },

    {
        id: "unbroken",
        name: "Unbroken",
        description:
            "Reach a 7-day streak.",
        icon: "🔥",

        unlocked: function () {

            return dailyQuests.some(
                function (quest) {

                    return (
                        quest.streak >= 7
                    );
                }
            );
        }
    },

    {
        id: "centurion",
        name: "Centurion",
        description:
            "Complete 100 quests.",
        icon: "🏛️",

        unlocked: function () {
            return player.questsDone >= 100;
        }
    }

];


function checkAchievements() {

    achievementDefinitions.forEach(
        function (achievement) {

            const exists =
                achievements.some(
                    function (item) {

                        return (
                            item.id ===
                            achievement.id
                        );
                    }
                );


            if (
                !exists &&
                achievement.unlocked()
            ) {

                achievements.push({

                    id:
                        achievement.id,

                    name:
                        achievement.name,

                    description:
                        achievement.description,

                    icon:
                        achievement.icon,

                    unlockedAt:
                        new Date()
                            .toLocaleDateString()

                });
            }
        }
    );


    saveData();
}


function renderAchievements() {

    achievementList.innerHTML =
        "";


    if (
        achievements.length === 0
    ) {

        achievementList.innerHTML =
            "<p>No achievements unlocked yet.</p>";

        return;
    }


    achievements.forEach(
        function (achievement) {

            const element =
                document.createElement(
                    "div"
                );


            element.className =
                "achievement-item";


            element.innerHTML = `

                <div class="achievement-icon">
                    ${achievement.icon}
                </div>

                <div>

                    <strong>
                        ${achievement.name}
                    </strong>

                    <span>
                        ${achievement.description}
                    </span>

                    <small>
                        Unlocked ${achievement.unlockedAt}
                    </small>

                </div>
            `;


            achievementList.appendChild(
                element
            );
        }
    );
}


// ========================================
// MAIN QUESTS
// ========================================

function renderMainQuests() {

    mainQuestList.innerHTML = "";


    if (
        mainQuests.length === 0
    ) {

        mainQuestList.innerHTML =
            "<p>No main quests yet.</p>";

        return;
    }


    mainQuests.forEach(
        function (quest, index) {

            const element =
                document.createElement(
                    "div"
                );

            element.className =
                "quest-item";


            element.innerHTML = `

                <div>

                    <h3>
                        ⚔️ ${quest.name}
                    </h3>

                    <p>
                        ${categoryIcon(quest.category)}
                        ${categoryName(quest.category)}
                        •
                        ${quest.difficulty.toUpperCase()}
                        •
                        +${quest.xp} XP
                    </p>

                </div>

                <div class="quest-actions">

                    <button class="edit-button">
                        EDIT
                    </button>

                    <button class="delete-button">
                        DELETE
                    </button>

                    <button class="complete-button">
                        COMPLETE
                    </button>

                </div>
            `;


            element.querySelector(".edit-button").addEventListener("click", function () {
                openQuestDialog("main", { quest: quest, index: index });
            });




            element
                .querySelector(
                    ".delete-button"
                )
                .addEventListener(
                    "click",
                    function () {

                        if (
                            !confirm(
                                `Delete "${quest.name}"?`
                            )
                        ) {
                            return;
                        }


                        mainQuests.splice(
                            index,
                            1
                        );


                        saveData();

                        renderMainQuests();
                    }
                );


            element
                .querySelector(
                    ".complete-button"
                )
                .addEventListener(
                    "click",
                    function () {

                        player.xp +=
                            quest.xp;

                        player.questsDone +=
                            1;


                        awardStat(
    quest.category,
    getStatReward(quest)
);

                        addToHistory(
                            quest,
                            "MAIN"
                        );


                        mainQuests.splice(
                            index,
                            1
                        );


                        saveData();

                        renderAll();
                    }
                );


            mainQuestList.appendChild(
                element
            );
        }
    );
}


// ========================================
// SIDE QUESTS
// ========================================

function renderSideQuests() {

    sideQuestList.innerHTML = "";


    if (
        sideQuests.length === 0
    ) {

        sideQuestList.innerHTML =
            "<p>No side quests yet.</p>";

        return;
    }


    sideQuests.forEach(
        function (quest, index) {

            const element =
                document.createElement(
                    "div"
                );

            element.className =
                "quest-item";


            element.innerHTML = `

                <div>

                    <h3>
                        🔹 ${quest.name}
                    </h3>

                    <p>
                        ${categoryIcon(quest.category)}
                        ${categoryName(quest.category)}
                        • SIDE
                        • +${quest.xp} XP
                    </p>

                </div>

                <div class="quest-actions">

                    <button class="edit-button">
                        EDIT
                    </button>

                    <button class="delete-button">
                        DELETE
                    </button>

                    <button class="complete-button">
                        COMPLETE
                    </button>

                </div>
            `;


            element.querySelector(".edit-button").addEventListener("click", function () {
                openQuestDialog("side", { quest: quest, index: index });
            });




            element
                .querySelector(
                    ".delete-button"
                )
                .addEventListener(
                    "click",
                    function () {

                        if (
                            !confirm(
                                `Delete "${quest.name}"?`
                            )
                        ) {
                            return;
                        }


                        sideQuests.splice(
                            index,
                            1
                        );


                        saveData();

                        renderSideQuests();
                    }
                );


            element
                .querySelector(
                    ".complete-button"
                )
                .addEventListener(
                    "click",
                    function () {

                        player.xp +=
                            quest.xp;

                        player.questsDone +=
                            1;


                        awardStat(
                            quest.category,
                            1
                        );


                        addToHistory(
                            quest,
                            "SIDE"
                        );


                        sideQuests.splice(
                            index,
                            1
                        );


                        saveData();

                        renderAll();
                    }
                );


            sideQuestList.appendChild(
                element
            );
        }
    );
}


// ========================================
// DAILY QUESTS
// ========================================

function renderDailyQuests() {

    dailyQuestList.innerHTML = "";


    if (
        dailyQuests.length === 0
    ) {

        dailyQuestList.innerHTML =
            "<p>No daily quests yet.</p>";

        return;
    }


    const today =
        getToday();


    dailyQuests.forEach(
        function (quest, index) {

            const done =
                quest.lastCompleted ===
                today;


            const element =
                document.createElement(
                    "div"
                );

            element.className =
                "quest-item";


            element.innerHTML = `

                <div>

                    <h3>
                        🔥 ${quest.name}
                    </h3>

                    <p>
                        ${categoryIcon(quest.category)}
                        ${categoryName(quest.category)}
                        • DAILY
                        • +${quest.xp} XP
                        • 🔥 ${quest.streak}
                        DAY${quest.streak === 1 ? "" : "S"}
                    </p>

                </div>

                <div class="quest-actions">

                    <button class="edit-button">
                        EDIT
                    </button>

                    <button class="delete-button">
                        DELETE
                    </button>

                    <button class="complete-button">
                        ${done ? "DONE ✓" : "COMPLETE"}
                    </button>

                </div>
            `;


            const complete =
                element.querySelector(
                    ".complete-button"
                );


            element.querySelector(".edit-button").addEventListener("click", function () {
                openQuestDialog("daily", { quest: quest, index: index });
            });




            element
                .querySelector(
                    ".delete-button"
                )
                .addEventListener(
                    "click",
                    function () {

                        if (
                            !confirm(
                                `Delete "${quest.name}"?`
                            )
                        ) {
                            return;
                        }


                        weeklyQuests.forEach(
                            function (weekly) {

                                if (
                                    weekly.linkedDailyId
                                    === quest.id
                                ) {

                                    weekly.linkedDailyId =
                                        null;
                                }
                            }
                        );


                        dailyQuests.splice(
                            index,
                            1
                        );


                        saveData();

                        renderAll();
                    }
                );


            if (done) {

                complete.disabled =
                    true;

            }

            else {

                complete.addEventListener(
                    "click",
                    function () {

                        if (
                            quest.lastCompleted
                            === getYesterday()
                        ) {

                            quest.streak += 1;

                        }

                        else {

                            quest.streak = 1;
                        }


                        quest.lastCompleted =
                            getToday();


                        player.xp +=
                            quest.xp;

                        player.questsDone +=
                            1;


                        awardStat(
                            quest.category,
                            1
                        );


                        // Every Daily completion
                        // also rewards Discipline.

                        if (
                            quest.category !==
                            "discipline"
                        ) {

                            awardStat(
                                "discipline",
                                1
                            );
                        }


                        advanceLinkedWeeklyQuests(
                            quest.id
                        );


                        addToHistory(
                            quest,
                            "DAILY"
                        );


                        saveData();

                        renderAll();
                    }
                );
            }


            dailyQuestList.appendChild(
                element
            );
        }
    );
}


// ========================================
// WEEKLY QUESTS
// ========================================

function renderWeeklyQuests() {

    weeklyQuestList.innerHTML = "";


    if (
        weeklyQuests.length === 0
    ) {

        weeklyQuestList.innerHTML =
            "<p>No weekly quests yet.</p>";

        return;
    }


    weeklyQuests.forEach(
        function (quest, index) {

            const ready =
                quest.progress >=
                quest.target;


            const percent =
                Math.min(
                    100,
                    (
                        quest.progress /
                        quest.target
                    ) * 100
                );


            const linkedDaily =
                quest.linkedDailyId
                    ? getDailyQuestById(
                        quest.linkedDailyId
                    )
                    : null;


            const tracking =
                linkedDaily
                    ? `AUTO: ${linkedDaily.name}`
                    : "MANUAL";


            const element =
                document.createElement(
                    "div"
                );

            element.className =
                "weekly-item";


            element.innerHTML = `

                <div class="weekly-top">

                    <div>

                        <h3>
                            📅 ${quest.name}
                        </h3>

                        <p>
                            ${categoryIcon(quest.category)}
                            ${categoryName(quest.category)}
                            • WEEKLY
                            • +${quest.xp} XP
                            • ${quest.progress}/${quest.target}
                            • ${tracking}
                        </p>

                    </div>


                    <div class="quest-actions">

                        ${
                            linkedDaily
                                ? ""
                                : '<button class="progress-button">+1</button>'
                        }

                        <button class="edit-button">
                            EDIT
                        </button>

                        <button class="delete-button">
                            DELETE
                        </button>

                        <button class="complete-button">
                            ${ready ? "CLAIM" : "LOCKED"}
                        </button>

                    </div>

                </div>


                <div class="weekly-progress">

                    <div
                        class="weekly-progress-fill"
                        style="width:${percent}%">
                    </div>

                </div>
            `;


            const progress =
                element.querySelector(
                    ".progress-button"
                );


            const complete =
                element.querySelector(
                    ".complete-button"
                );


            if (progress) {

                progress.addEventListener(
                    "click",
                    function () {

                        if (
                            quest.progress <
                            quest.target
                        ) {

                            quest.progress +=
                                1;
                        }


                        saveData();

                        renderWeeklyQuests();
                    }
                );
            }


            element
                .querySelector(
                    ".delete-button"
                )
                .addEventListener(
                    "click",
                    function () {

                        if (
                            !confirm(
                                `Delete "${quest.name}"?`
                            )
                        ) {
                            return;
                        }


                        weeklyQuests.splice(
                            index,
                            1
                        );


                        saveData();

                        renderWeeklyQuests();
                    }
                );


            if (!ready) {

                complete.disabled =
                    true;

            }

            else {

                complete.addEventListener(
                    "click",
                    function () {

                        player.xp +=
                            quest.xp;

                        player.questsDone +=
                            1;


                        awardStat(
                            quest.category,
                            2
                        );


                        addToHistory(
                            quest,
                            "WEEKLY"
                        );


                        weeklyQuests.splice(
                            index,
                            1
                        );


                        saveData();

                        renderAll();
                    }
                );
            }


            weeklyQuestList.appendChild(
                element
            );
        }
    );
}


// ========================================
// HISTORY
// ========================================

function renderHistory() {

    historyList.innerHTML = "";


    if (
        questHistory.length === 0
    ) {

        historyList.innerHTML =
            "<p>No completed quests yet.</p>";

        return;
    }


    questHistory.forEach(
        function (entry) {

            const element =
                document.createElement(
                    "div"
                );


            element.className =
                "history-item";


            element.innerHTML = `

                <div>

                    <strong>
                        ✓ ${entry.name}
                    </strong>

                    <span>
                        ${entry.type}
                        • ${entry.date}
                        ${entry.time}
                    </span>

                </div>

                <b>
                    +${entry.xp} XP
                </b>
            `;


            historyList.appendChild(
                element
            );
        }
    );
}


// ========================================
// QUEST FORGE
// ========================================

function openQuestDialog(type, edit = null) {
    questDialogType = type;
    editingQuest = edit;
    questForm.reset();
    questFormError.textContent = "";
    questDialogTitle.textContent = `${edit ? "EDIT" : "CREATE"} ${type.toUpperCase()} QUEST`;
    questForm.querySelector(".primary-action").textContent = edit ? "SAVE CHANGES" : "FORGE QUEST";
    difficultyField.hidden = type !== "main";
    xpField.hidden = type === "main";
    targetField.hidden = type !== "weekly";
    dailyLinkField.hidden = type !== "weekly";
    questXPInput.value = type === "daily" ? 30 : type === "weekly" ? 300 : 100;
    questCategoryInput.value = type === "daily" || type === "weekly" ? "discipline" : "general";
    questDailyLinkInput.innerHTML = '<option value="">Manual progress</option>' + dailyQuests.map(function (quest) {
        return `<option value="${quest.id}">${quest.name}</option>`;
    }).join("");
    if (edit) {
        questNameInput.value = edit.quest.name;
        questCategoryInput.value = edit.quest.category || "general";
        questXPInput.value = edit.quest.xp || questXPInput.value;
        questDifficultyInput.value = String(edit.quest.difficulty || "easy").toLowerCase();
        questTargetInput.value = edit.quest.target || 5;
        questDailyLinkInput.value = edit.quest.linkedDailyId || "";
    }
    questDialog.showModal();
    requestAnimationFrame(function () { questNameInput.focus(); });
}

function closeQuestDialog() {
    editingQuest = null;
    questDialog.close();
}

addMainQuestButton.addEventListener("click", function () { openQuestDialog("main"); });
addSideQuestButton.addEventListener("click", function () { openQuestDialog("side"); });
addDailyQuestButton.addEventListener("click", function () { openQuestDialog("daily"); });
addWeeklyQuestButton.addEventListener("click", function () { openQuestDialog("weekly"); });
document.getElementById("close-quest-dialog").addEventListener("click", closeQuestDialog);
document.getElementById("cancel-quest-dialog").addEventListener("click", closeQuestDialog);

questDialog.addEventListener("click", function (event) {
    if (event.target === questDialog) closeQuestDialog();
});

questForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const name = questNameInput.value.trim();
    const category = normalizeCategory(questCategoryInput.value);
    const xp = Number(questXPInput.value);

    if (!name) {
        questFormError.textContent = "Give the quest a name.";
        questNameInput.focus();
        return;
    }

    if (questDialogType === "main") {
        const difficulty = questDifficultyInput.value;
        const value = { name, difficulty: difficulty[0].toUpperCase() + difficulty.slice(1), xp: mainXPRewards[difficulty], category };
        if (editingQuest) Object.assign(editingQuest.quest, value); else mainQuests.push(value);
    }
    else if (!Number.isFinite(xp) || xp < 1) {
        questFormError.textContent = "XP must be at least 1.";
        questXPInput.focus();
        return;
    }
    else if (questDialogType === "side") {
        const value = { name, xp, category };
        if (editingQuest) Object.assign(editingQuest.quest, value); else sideQuests.push(value);
    }
    else if (questDialogType === "daily") {
        if (editingQuest) Object.assign(editingQuest.quest, { name, xp, category });
        else dailyQuests.push({ id: makeId(), name, xp, category, lastCompleted: null, streak: 0 });
    }
    else {
        const target = Number(questTargetInput.value);
        if (!Number.isFinite(target) || target < 1) {
            questFormError.textContent = "Weekly target must be at least 1.";
            questTargetInput.focus();
            return;
        }
        const value = { name, target, xp, category, linkedDailyId: questDailyLinkInput.value || null };
        if (editingQuest) Object.assign(editingQuest.quest, value);
        else weeklyQuests.push({ ...value, progress: 0 });
    }

    saveData();
    renderAll();
    closeQuestDialog();
});

clearHistoryButton.addEventListener(
    "click",
    function () {

        if (
            questHistory.length === 0
        ) {
            return;
        }


        if (
            !confirm(
                "Clear history?\nXP will remain."
            )
        ) {
            return;
        }


        questHistory = [];


        saveData();

        renderHistory();
    }
);


// ========================================
// RENDER ALL
// ========================================

function renderAll() {

    checkAchievements();

    renderMainQuests();

    renderSideQuests();

    renderDailyQuests();

    renderWeeklyQuests();

    renderAchievements();

    renderHistory();

    updateCharacter();
}


// ========================================
// START
// ========================================

saveData();

addBackupButtons();

renderAll();
