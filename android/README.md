# Quest Widgets — Android preview
A separate Android companion with a 4×4 resizable Daily Quests widget. It uses a bundled dashboard, so local tasks work offline. Android 8+; modern Android System WebView required.

## Connect existing progress
1. In Chrome Dashboard → History → Export, save a JSON backup.
2. Install the APK, open Quest Widgets and choose Import backup. Alternatively sign in with the same cloud account.
3. Tap Add widget or long-press your launcher → Widgets → Quest Widgets.
4. Tap an unfinished quest in the widget to open the app and complete it using the dashboard's existing completion handler (XP, streak, linked weekly progress, history).
Completed rows open the app without awarding XP again.

Chrome and companion local storage are separate. After import use the companion as the primary dashboard, or sign into cloud sync on both. The widget shows the latest companion save, not a live background cloud feed. Open the app to fetch changes from another device. Android schedules idle refreshes about every 30 minutes; exact scheduling depends on the launcher.

## Build
Java 17, Android SDK 35, Gradle 8.11.1. Run `python android/prepare_assets.py` from repository root, then `gradle -p android assembleDebug lintDebug`.
GitHub Actions builds and uploads an installable debug APK for preview. Not a production/Play Store signing setup. Debug signing keys on ephemeral runners change, so a later preview build may require uninstalling the previous one: export your backup first.

## Boundaries
The native bridge is restricted to the bundled HTTPS asset origin and main frame. It sends only daily quests and a timestamp into private app preferences; it never receives passwords/auth tokens. APK assets are fixed at build time; install a new build to update the companion. Public PWA code is unchanged.
