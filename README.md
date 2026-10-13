# Couplesify 💕 - Romantic Mobile App for Couples

> A complete, production-ready, beautiful cross-platform mobile application designed for partners to stay intimately connected through shared widget doodles, relationship milestones, real-time messaging, games, and photo scrapbooks.

---

## 🎨 1. Design System & Aesthetics

Couplesify implements a signature romantic pastel aesthetic:
- **Primary Background**: Vertical linear gradient from soft blush pink (`#FCE8EC`) blending smoothly into warm creamy ivory (`#FFF7F8`).
- **Accent & Primary Action**: Vibrant Coral-Strawberry (`#FF6575`) for primary pill buttons, active toggles, and pulse highlights.
- **Romantic Secondary Pastels**:
  - Gentle Lavender (`#E3D9F8`)
  - Mint Green (`#D3F2E4`)
  - Soft Peach/Yellow (`#FFECCC`)
  - Baby Sky Blue (`#D7EEFF`)
- **Surfaces & Cards**: Crisp white (`#FFFFFF`) with high border-radius (`24px` to `28px`), frosted blur (`backdrop-filter`), and soft diffuse drop-shadows.
- **Typography**: Clean rounded sans-serif font family with high-contrast charcoal (`#2D242B`) headers and soft slate-taupe (`#7A6F75`) captions.
- **Icons & Vibe**: Playful 3D claymorphic rounded design styling with interactive tactile haptics.

---

## 📱 2. Core Screens & Feature Architecture

### Screen 1: Home / Today Dashboard
- **Header**: App title `Couplesify`, partner sync status chip (`Maya (Online)`) with pulsing green dot, and settings gear.
- **Relationship Counter Ring**: Glowing circular frame featuring couple avatars with a circular progress indicator, displaying live calculated badge: `[X] Days Together` derived from the anniversary date.
- **Widget Doodle Launcher**: Prominent Coral pill button: `[Pencil Icon] Doodle on Widget >` opening the canvas.
- **Live Lockscreen & Home Widget Preview**: Displays the currently synced shared doodle directly on the home dashboard.
- **Mood Tracker Strip**: Horizontal selector with round reaction badges (`Loving 🥰`, `Sleepy 😴`, `Needy 🥺`, `Grumpy 😤`, `Excited 🥳`, `Cuddly 🧸`) with live partner mood card.
- **"Our Memories Today" Teaser**: Polaroid preview card showing an anniversary snapshot or "1 Year Ago Today" photo.

### Screen 2: Interactive Shared Doodle Widget
- **Smooth Canvas**: Touch & pointer responder with bezier smoothing.
- **Creative Tools**:
  - Brush size selector (`S`, `M`, `L`).
  - Romantic pastel palette (`Coral #FF6575`, `Lavender #9C84E2`, `Mint #48C08A`, `Peach #FFB049`, `Sky Blue #5CA9F8`, `Charcoal #2D242B`, `White #FFFFFF`).
  - Eraser mode, Undo, Redo, and Clear.
- **Instant Widget Sync**: `Send to Partner Widget` button triggers real-time WebSocket broadcast and local persistent cache.

### Screen 3: Games & Play Zone
- **2x2 Mini-Game Grid**:
  1. **Daily Couple Quiz 💌**: Multiple-choice questions with partner answer reveal and match banner.
  2. **Live Tic-Tac-Toe ❤️ vs ⭐**: Real-time turn-based grid with automated partner response and celebration banner.
  3. **Spicy Romantic Wheel 🎡**: Interactive animated spinning wheel with categorized prompts (`Mild 🌸`, `Warm 🔥`, `Wild/Spicy 🌶️`).
  4. **Truth or Dare Deck 🃏**: 3D tap-to-reveal cards with romantic & spicy prompts.
- **Couple Goals Checklist**: Itemized bucket list with category chips, progress bars (e.g., `Weekly Date Ideas 3/4`, `Visit a New Café`), and `+ Add Goal` modal.

### Screen 4: Memory Gallery & Scrapbook
- **Dual-Toggle Pill**: Switch between `Memories` timeline and `Letters` notes.
- **Start Your Gallery**: Hero banner with Coral `+ Upload Memory` button.
- **Chronological Timeline**: Vertical rose connecting line linking polaroid cards with date stamps (`Oct 10, 2026`), captions, tag pills (`Date Night`, `Anniversary`, `Road Trip`), and double-tap heart reactions.

### Screen 5: Private 1-on-1 Messaging
- Real-time instant messaging with typing indicators (`Maya is typing... 💕`).
- Delivered / read receipts (`✓✓`).
- Voice note audio waveform player simulation.
- Love Nudge alerts inside the conversation.
- 6-digit invite code pairing modal (`LOVE-77`).

### Central Interactive Action: Floating Coral Heart
- Floating raised coral button in the bottom navigation bar.
- Triggers **Love Nudge Modal** with instant haptic pings: `Warm Squeeze 🤗`, `Miss You Ping 💌`, `Kiss Alert 💋`, `Cuddle Request 🧸`.

---

## 🛠️ 3. Technology Stack

- **Framework**: React Native with Expo SDK 57 (Prebuild & EAS ready).
- **Languages**: TypeScript (`strict` mode verified, zero type errors).
- **Backend & Realtime**: Supabase (`@supabase/supabase-js`, Auth, PostgreSQL, Realtime WebSockets, Storage).
- **Local Persistence**: `@react-native-async-storage/async-storage`.
- **Vector Graphics**: `react-native-svg` for vector path rendering, progress rings, and widget doodles.
- **Tactile Feedback**: `expo-haptics`.
- **Gradients**: `expo-linear-gradient`.
- **Media**: `expo-image-picker`.

---

## 🚀 4. Build & Export Pipelines

### A. Android APK Build via GitHub Actions CI/CD
The repository includes `.github/workflows/build-apk.yml`. On every push or pull request to `main`:
1. Checks out repository and configures JDK 17 & Node.js 20.
2. Installs dependencies and runs `npx expo prebuild --platform android`.
3. Runs `./gradlew assembleDebug` inside the generated `android/` directory.
4. Uploads `app-debug.apk` as a downloadable GitHub Actions artifact.

### B. Standalone APK Export via EAS Build
Run:
```bash
npx eas-cli@latest build -p android --profile preview
```
This builds an installable standalone Android APK directly in the cloud.

### C. Running Locally
```bash
# Start Metro bundler (Web, Android, iOS)
npm start

# Run in Web browser
npm run web

# Run on Android device / emulator
npm run android

# Run on iOS simulator (macOS required)
npm run ios
```

---

## 📂 5. Directory Structure

```
couplesify/
├── .github/
│   └── workflows/
│       └── build-apk.yml          # GitHub CI/CD Android APK workflow
├── src/
│   ├── components/
│   │   ├── CoupleAvatarRing.tsx   # Relationship counter ring & milestone badge
│   │   ├── CustomBottomBar.tsx    # Persistent floating pill navigation bar
│   │   ├── DoodleCanvas.tsx       # Smooth stroke drawing canvas & pastel palette
│   │   ├── GameTile.tsx           # Claymorphic mini-game card tile
│   │   ├── GoalCard.tsx           # Bucket list progress bar card
│   │   ├── LoveNudgeModal.tsx     # Central heart love nudge popup
│   │   ├── MoodSelector.tsx       # Horizontal mood selector & partner status
│   │   ├── PairingModal.tsx       # 6-digit code pairing & anniversary settings
│   │   └── PolaroidCard.tsx       # Polaroid memory card with heart reactions
│   ├── screens/
│   │   ├── HomeScreen.tsx         # Dashboard with ring, mood, widget, memory
│   │   ├── DoodleScreen.tsx       # Shared widget canvas screen
│   │   ├── GamesScreen.tsx        # 4 mini-games & couple goals
│   │   ├── MemoryScreen.tsx       # Polaroid timeline scrapbook
│   │   └── ChatScreen.tsx         # Real-time private 1-on-1 messaging
│   ├── services/
│   │   ├── RealtimeService.ts     # Supabase Realtime broadcast & fallback loop
│   │   ├── StorageService.ts      # AsyncStorage offline cache
│   │   ├── SupabaseClient.ts      # Supabase client initialization
│   │   └── WidgetSyncService.ts   # Widget payload exporter & sync
│   ├── theme/
│   │   ├── AppColors.ts           # Romantic pastel color palette
│   │   ├── AppTheme.ts            # Frosted glass & claymorphic card styles
│   │   └── AppTypography.ts       # Rounded typography hierarchy
│   └── AppContainer.tsx           # Navigation coordinator
├── App.tsx                        # App entry point
├── app.json                       # Android permissions, package name & iOS config
├── eas.json                       # EAS Build profile for APK export
└── tsconfig.json                  # TypeScript compiler settings
```
