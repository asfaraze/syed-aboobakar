# Syed Aboobakar Kedai – Grocery E-Commerce Platform

A production-oriented, full-stack grocery ordering web application designed specifically for **Syed Aboobakar Kedai** in Malaysia.

Built strictly on an **Online Ordering with In-Store Pickup ONLY** model with real backend database calculations, inventory reservation, 2-hour pickup slot scheduling, role-based administration, two-factor authentication, and tamper-evident audit logging.

---

## 📌 Business Profile & Core Rules

- **Business Name:** Syed Aboobakar Kedai
- **Location:** Jalan Pasar, Malaysia
- **Currency:** Malaysian Ringgit (MYR / RM) – Stored in whole sen (e.g., RM 12.50 = 1250 sen)
- **Operating Hours:** 8:00 AM – 8:00 PM Malaysia Time (Asia/Kuala_Lumpur, UTC+8)
- **Shopping Model:** **In-Store Pickup ONLY**. There is NO home delivery, NO delivery address, NO delivery fees, and NO hotel accounts. Customers select their groceries online and collect them in-store during their reserved slot.
- **Default Payment Method:** **Pay at the Shop** (Cash, DuitNow QR, or Credit/Debit Card at counter upon collection).
- **Online Payment:** Billplz FPX Malaysia integration is structured and prepared, but remains **DISABLED by default** until the business owner completes SSM registration and configures credentials.

---

## 🚀 Key Features

### 1. Multilingual Support (3 Languages)
- **English (EN)**
- **Bahasa Malaysia (BM)**
- **Tamil (தமிழ்)**
- Centralized translation dictionary (`client/src/translations/index.js`).
- Product names and descriptions dynamically render in the selected language.

### 2. 10 Product Categories (50+ Sample Malaysian Products Seeded)
1. **Rice & Grains** (e.g., Jasmine Super Special 10kg, Cap Rambutan 5kg, Kohinoor Basmati, Quaker Oats)
2. **Oil & Spices** (e.g., Seri Murni 5kg, Baba's Curry Powder, Alagappa's Chilli Powder, Adabi Sup Bunjut)
3. **Vegetables** (e.g., Cameron Highlands Sawi, Kangkung Segar, Cili Padi Merah, Kobis Bulat, Bawang Merah Ros)
4. **Fruits** (e.g., Pisang Berangan, Betik Sekaki, Tembikai Tanpa Biji, Nenas Madu Johor, Epal Fuji)
5. **Meat & Fish** (e.g., Ayam Segar Bersih Halal, Ikan Kembung, Daging Lembu Tempatan, Udang Laut, Ikan Siakap)
6. **Dairy & Eggs** (e.g., Telur Gred A 30 Biji, Dutch Lady Full Cream 1L, SCS Butter, Chesdale Cheese)
7. **Snacks** (e.g., Hup Seng Cream Crackers, Julie's Peanut Butter, Mister Potato, Pagoda Menglembu)
8. **Drinks** (e.g., Milo Serbuk 1kg, BOH Teh Tarik 3-in-1, Kopi O Hang Tuah, Yeo's Soya, Ribena 1L)
9. **Household** (e.g., Dynamo Power Gel 2.7kg, Sunlight Lemon, Premier Tissues, Dettol Antiseptic, Clorox)
10. **Others** (e.g., CSR Gula Pasir 1kg, Garam Cap Udang, Tepung Sauh 1kg, Kara Santan 200ml, Sos Tiram)

### 3. Pickup-Only Checkout & Scheduling
- 8-day booking window (Today + next 7 days).
- Exactly six daily 2-hour pickup slots:
  - `08:00 – 10:00`
  - `10:00 – 12:00`
  - `12:00 – 14:00`
  - `14:00 – 16:00`
  - `16:00 – 18:00`
  - `18:00 – 20:00`
- Automatic calculation based on Malaysia Time (UTC+8): Slots that have already started or passed today are hidden.
- Configurable capacity per slot with atomic transactional booking to prevent overbooking.
- Unique Order Number generation (e.g., `SAK-20261117-0042`).
- Unique 4-digit Pickup Code generation (e.g., `PK-7824`) for fast cashier verification.

### 4. Order Tracking & 5-Stage Visual Workflow
`Placed` ➔ `Confirmed` ➔ `Preparing` ➔ `Ready for pickup` ➔ `Collected`
- Look up orders by Order Number + Phone Number / Pickup Code.
- Customers can cancel an order **only before** it enters the `Preparing` stage.
- Cancellation transactionally restores reserved stock and releases slot capacity.

### 5. Seller Administration Portal (`/admin`)
- **Role-Based Access Control (RBAC):**
  - **OWNER:** Full access to financial analytics, store settings, staff account management, CSV report export, and customer contact unmasking.
  - **STAFF:** Operational access to manage products, adjust shelf stock, and fulfill pickup orders. Staff **cannot** see sales financial figures, staff management, store settings, or unmasked customer contacts.
- **Two-Factor Authentication (TOTP):** Compatible with Google Authenticator and Microsoft Authenticator.
- **Customer Contact Privacy:** Phone and email are masked by default (`+601****89`, `a***r@...`). Only the Owner can reveal contact details with immutable audit logging.
- **Tamper-Evident Audit Logging:** Every login, product change, stock adjustment, contact reveal, and status update is signed with SHA-256 hash chaining (`prev_hash ➔ record_hash`).
- **Bulk CSV Product Import & Export:** One-click CSV template download, row-by-row import with error reporting, and orders export.
- **Live Sound Alerts:** Audio chime plays automatically in the seller dashboard when new orders arrive via Server-Sent Events (SSE), with a mute/unmute toggle.

---

## 🛠️ Technology Stack

- **Frontend:** React 18, Vite 6, Tailwind CSS, React Router 7, Lucide React icons, Canvas Confetti.
- **Backend:** Node.js (v20+ / v26+), Express.js, `node:sqlite` (SQLite with WAL mode and foreign keys).
- **Security:** bcrypt password hashing, HTTP-only SameSite cookies, JWT, Helmet security headers, CORS, express-rate-limit (15-min lockout after 5 failed password attempts), SHA-256 hash chaining.
- **Testing:** Node.js native test runner (`node --test`), 22 comprehensive automated tests covering pickup rules, inventory concurrency, security lockout, and business logic.

---

## 📦 Quick Start Guide (Local Setup)

### 1. Prerequisites
- Node.js version 20 or higher installed.

### 2. Install Dependencies
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
cd ..
```

### 3. Run Automated Tests
Verify all 22 business logic, security, and pickup slot tests pass:
```bash
npm run test
```
*Expected result: 22 pass, 0 fail.*

### 4. Seed the Database
Populate the database with all 10 categories, 52 Malaysian products, sample users, and coupons:
```bash
npm run seed
```

### 5. Start the Application
You can run the full-stack app in two modes:

#### Option A: Unified Full-Stack Run (Recommended for Beginners)
Build the frontend once, then start the Express server (which automatically serves both the API and the React frontend on Port 5000):
```bash
# Build client
npm run build:client

# Start server
npm run start
```
Now open your browser at: **`http://localhost:5000`**

#### Option B: Development Mode (Hot Reloading)
Open two separate terminal windows:

Terminal 1 (Backend API):
```bash
npm run dev:server
# Server runs on http://localhost:5000
```

Terminal 2 (Frontend with Vite HMR):
```bash
npm run dev:client
# Client runs on http://localhost:3000 (proxies /api to 5000)
```

---

## 🔑 Default Login Accounts

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Store Owner** | `owner@syedaboobakarkedai.com` | `Owner@123456` | Full Access (Financials, Settings, Staff, Contact Reveals, CSV) |
| **Staff Member**| `staff@syedaboobakarkedai.com` | `Staff@123456` | Operational Access (Products, Orders, Stock only) |
| **Customer**    | `customer@gmail.com` | `Customer@123456` | Customer Store, Order Tracking & Profile |

---

## 🎟️ Active Promotional Coupons

- **`WELCOME10`**: 10% discount on orders of RM 30.00 and above (max discount RM 10.00).
- **`KEDAI5`**: Flat RM 5.00 discount on orders of RM 40.00 and above.
- **`JIMAT20`**: 20% discount on bulk orders of RM 100.00 and above (max discount RM 30.00).

---

## 🔒 Security Architecture

1. **5-Attempt Account Lockout:** Users attempting 5 consecutive incorrect passwords are automatically locked out for 15 minutes.
2. **Server-Side Price Authority:** Client-side prices are never trusted. All subtotals, coupon percentage/fixed limits, and stock quantities are re-validated and calculated in an ACID transaction on the server.
3. **Tamper-Evident Audit Trail:** The `audit_logs` table links every log entry to the hash of the preceding entry:
   $$\text{record\_hash} = \text{SHA256}(\text{prev\_hash} + \text{actor} + \text{action} + \text{details} + \text{timestamp})$$
   Any modification of previous rows immediately flags a corruption warning in the seller portal.
4. **Customer Data Masking:** Staff cannot view raw customer contact information, preventing unauthorized data exfiltration.

---

## 🌐 External Integrations (Prepared & Disabled)

### Billplz FPX Malaysia Payment Gateway
- Located in `server/src/controllers/ordersController.js` and `server/src/routes/orders.js`.
- Disabled by default (`billplz_enabled = false`).
- **To activate:**
  1. Complete business registration (SSM) and open a Malaysian commercial bank account.
  2. Sign up at [billplz.com](https://www.billplz.com) and obtain your API Secret Key and Collection ID.
  3. Navigate to **Seller Dashboard ➔ Shop Settings ➔ Billplz FPX**, input credentials, and toggle to `ENABLED`.

### SMTP Email Notifications
- Located in `server/src/utils/notifications.js`.
- Disabled by default (`smtp_enabled = false`).
- **To activate:**
  1. Configure credentials from an email provider (e.g., Mailgun, SendGrid, Amazon SES, or custom cPanel SMTP).
  2. Enter host, port, user, and password in **Seller Dashboard ➔ Shop Settings ➔ Email Service**.

---

## 📁 Project Directory Layout

```text
syed-aboobakar-kedai/
├── client/
│   ├── src/
│   │   ├── components/      # Navbar, Footer, ProductCard
│   │   ├── context/         # AuthContext, CartContext, LanguageContext, NotificationContext
│   │   ├── pages/           # Home, Products, ProductDetails, Cart, Checkout, OrderConfirmation, OrderTracking, CustomerAuth, CustomerProfile, ShopInfo
│   │   │   └── admin/       # AdminLayout, AdminOverview, AdminOrders, AdminProducts, AdminInventory, AdminCustomers, AdminAnalytics, AdminCoupons, AdminStaff, AdminAuditLogs, AdminSettings
│   │   ├── translations/    # Central dictionaries (English, Malay, Tamil)
│   │   ├── App.jsx          # Route configuration
│   │   ├── index.css        # Tailwind directives & typography
│   │   └── main.jsx         # React root
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/
│   ├── data/                # SQLite database (grocery.db)
│   ├── src/
│   │   ├── config/          # Database connection, business constants
│   │   ├── controllers/     # Auth, Products, Pickup, Cart, Orders, Admin, Coupons, Notifications
│   │   ├── middleware/      # JWT, HTTP-only cookie authentication, RBAC
│   │   ├── models/          # Database schema migrations
│   │   ├── routes/          # Express route endpoints
│   │   ├── seed/            # 52 Malaysian products, users, coupons seeder
│   │   ├── utils/           # PickupSlots, Pricing, AuditLogger, NotificationService
│   │   └── index.js         # Server entry point
│   ├── tests/               # 22 automated test suites
│   ├── package.json
│   └── .env
├── uploads/                 # Product photos storage
├── .env.example
├── .gitignore
├── package.json
└── README.md
```
