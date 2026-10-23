# Pocket Ledger Mobile (React Native + Expo)

A high-performance mobile application extension for **Pocket Ledger**, built with **React Native**, **Expo SDK**, **TypeScript**, and **Expo Router**.

The mobile application connects directly to your existing **FastAPI** backend and **PostgreSQL/SQLite** database, enabling seamless real-time data synchronization between the web application and mobile devices.

---

## 📱 Features

1. **Authentication & Session Security**:
   - Register and Login against existing backend users.
   - Secure encrypted token storage using **Expo SecureStore** (iOS Keychain / Android Keystore).
   - Automatic session refresh and graceful 401 expiration handling.

2. **Dashboard & KPIs**:
   - Total Net Balance aggregated across all accounts.
   - Monthly Income, Expense, and Net Cash Flow summaries.
   - Quick Action buttons for Add Expense, Add Income, and Transfer.
   - Interactive 7-day cash flow bar chart and top category spending progress meters.
   - Pull-to-refresh synchronization with backend database.

3. **Multi-Wallet & Account Management**:
   - Support for Bank accounts, UPI / Digital Wallets, Cash funds, and Credit Cards.
   - Real-time balance deductions, additions, and inter-wallet transfers.
   - Add, edit, and delete wallets with custom color swatches.

4. **Unified Transactions Ledger**:
   - Real-time search by notes, descriptions, categories, or amounts.
   - Multi-filtering by type (`All`, `Expenses`, `Income`, `Transfers`) and category.
   - Month-by-month pagination and filtering (`YYYY-MM`).
   - Create, edit, and delete transactions.

5. **Financial Analytics & Budgeting**:
   - Monthly budget target limit configuration.
   - Dynamic budget meter with percentage utilization, remaining balance, and warning thresholds.
   - Income sources breakdown and category allocation percentages.

6. **Bank Statement Import & Export**:
   - CSV bank statement file picker with preview before committing to the database.
   - One-tap CSV export of transactions with native device sharing (`expo-sharing`).

7. **Appearance & Settings**:
   - Light and Dark themes aligned with Pocket Ledger's fintech design system.
   - Multi-currency selection (INR `₹`, USD `$`, EUR `€`, GBP `£`, JPY `¥`, etc.) synced with web profile.
   - Custom category creation and deactivation.

---

## 🛠️ Project Structure

```text
mobile/
├── app/                           # Expo Router file-based navigation
│   ├── (tabs)/                    # Persistent bottom tab navigation
│   │   ├── _layout.tsx            # Bottom tab bar configuration
│   │   ├── index.tsx              # Dashboard Screen
│   │   ├── transactions.tsx       # Transactions Ledger Screen
│   │   ├── wallets.tsx            # Wallets & Accounts Screen
│   │   ├── analytics.tsx          # Financial Insights & Budget Screen
│   │   └── settings.tsx           # Settings & Preferences Screen
│   ├── modal/                     # Modal overlay forms
│   │   ├── transaction.tsx        # Add / Edit Transaction & Transfer Modal
│   │   ├── wallet.tsx             # Add / Edit Wallet Modal
│   │   ├── budget.tsx             # Monthly Budget Target Modal
│   │   ├── csv.tsx                # Bank Statement CSV Import Modal
│   │   └── category.tsx          # Custom Category Management Modal
│   ├── _layout.tsx                # Root layout, Stack, and App Providers
│   ├── login.tsx                  # Secure Sign-In Screen
│   └── register.tsx               # Account Registration Screen
│
├── src/
│   ├── components/                # Reusable UI controls (Button, Input, StatCard, Header, etc.)
│   ├── constants/                 # Categories, icons, and color registry
│   ├── context/                   # State providers (AuthContext, ThemeContext, AppContext)
│   ├── services/                  # API client (api.ts) & Secure Storage (storage.ts)
│   ├── theme/                     # Light & Dark color tokens, spacing, typography
│   ├── types/                     # Shared TypeScript schemas matching FastAPI contracts
│   └── utils/                     # Currency formatters, date shifting, CSV helpers
│
├── assets/                        # App icons, splash screens, and images
├── scripts/
│   └── verify-backend.js          # Automated end-to-end backend connectivity check
├── .env.example                   # Reference environment configuration
├── app.json                       # Expo configuration
├── package.json                   # Mobile dependencies
└── tsconfig.json                  # TypeScript compiler configuration
```

---

## ⚙️ Environment Configuration

Create a `.env` file inside `mobile/` based on `.env.example`:

```bash
cp .env.example .env
```

Set `EXPO_PUBLIC_API_URL` based on your testing environment:

### 1. Android Emulator
Android emulators run on an isolated virtual network. The host machine is accessible at `10.0.2.2`:
```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000
```
*(Note: The mobile API client automatically translates `localhost` to `10.0.2.2` when running on an Android emulator if left as default).*

### 2. Physical Android or iOS Device (on same Wi-Fi)
When running the Expo Go app or a development build on a physical phone, set your computer's local Wi-Fi IP address:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.15:8000
```
> **Tip**: Ensure your computer's firewall allows inbound connections on port 8000, and ensure FastAPI is started with `--host 0.0.0.0` so it listens on all interfaces.

### 3. iOS Simulator or Web Preview
iOS simulators share the host network directly:
```env
EXPO_PUBLIC_API_URL=http://localhost:8000
```

---

## 🚀 Running the Full Stack Locally

Run all three applications together for development:

### Terminal 1: FastAPI Backend
```bash
cd backend
# Windows:
.\venv\Scripts\activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2: React Web Frontend
```bash
cd frontend
npm run dev
# Running at http://localhost:5173
```

### Terminal 3: Expo Mobile App
```bash
cd mobile
npm start
```
From the interactive Expo terminal:
- Press `a` to launch on Android emulator.
- Press `i` to launch on iOS simulator (macOS).
- Press `w` to launch in web browser.
- Scan the QR code with **Expo Go** on a physical phone connected to the same Wi-Fi.

---

## 🧪 Verification & Testing

Verify that your mobile API client connects properly to the real backend and database:

```bash
cd mobile
node scripts/verify-backend.js
```

This verifies:
- Backend health probe (`/health`)
- User registration and login token issuance (`/api/v1/auth/login`)
- Authenticated profile verification (`/api/v1/auth/me`)
- Real wallet retrieval and creation (`/api/v1/wallets`)
- Transactions ledger query (`/api/v1/transactions`)
- Financial analytics and budget summary (`/api/v1/insights`)
- Category synchronization (`/api/v1/categories`)
- User currency preference retrieval (`/api/v1/settings/currency`)

---

## 🔒 Security & Data Safety

- Sensitive JWT authentication tokens are stored using `expo-secure-store` which utilizes the iOS Keychain and Android Keystore (EncryptedSharedPreferences).
- No duplicate database or duplicate schemas are created for mobile; both platforms share the exact same SQLAlchemy models and PostgreSQL/SQLite records.
- If an authorization token expires (HTTP 401), the mobile app automatically clears the cached credentials and routes to the login screen without data corruption.
