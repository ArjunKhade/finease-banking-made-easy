# FinEase - Modern Banking Web UI

FinEase is a sleek, responsive, enterprise-grade banking user interface built with **Angular (Standalone Architecture)** and **Angular Material**, crafted specifically for the Spring Boot Banking Microservices ecosystem.

---

## 🎨 Feature Overview (Matching Mockups)

1. **Authentication**
   - **Login Page (`/login`)**: Split-screen design with brand showcase hero, remember me, password visibility toggle, and reactive validation.
   - **Signup Page (`/signup`)**: Customer onboarding form connected directly to `POST /api/create` (Accounts Microservice).
2. **Dashboard (`/dashboard`)**
   - **Top KPI Metric Cards**: Aggregated balance, active loans, and card count.
   - **Quick Actions**: "+ Add Account", "+ Add Card", and "Apply Loan".
   - **Recent Transactions Feed**: UPI transfers, salary credits, shopping, and ATM withdrawals with colored cashflow indicators.
   - **Live Backend Telemetry**: Status indicators for Accounts (`8080`), Loans (`8090`), Cards (`9000`), and Gateway (`8072`).
3. **Accounts Overview (`/accounts`)**
   - **Account Category Tabs**: Savings Accounts, Current Accounts, Fixed Deposits.
   - **Interactive Account Cards**: Masked account numbers, live balances, branch tags.
   - **Account Details Drawer**: Account holder, IFSC code (`SBN0001234`), branch address, transaction history, statement download.
   - **"+ Add Account" Reactive Modal**: Onboards a new account and updates the UI instantly.
4. **Cards Management (`/cards`)**
   - **Virtual Card Graphic**: Realistic Navy-blue gradient card with EMV gold chip, contactless NFC wave, embossed card number, expiry, cardholder name, and VISA branding.
   - **Card Controls Dialog**: Daily spending limit slider, international usage toggle, online e-commerce toggle, ATM PIN reset, and card freeze/block action.
   - **"+ Issue New Card" Reactive Modal**: Directly invokes Cards microservice `POST /api/create`.
5. **Loans & Mortgages (`/loans`)**
   - **Active Loans Cards**: Home Loans, Personal Loans with balances, EMIs, and due dates.
   - **Multi-step Loan Application**: Personal details, employment details, requested amount, tenure, and purpose.
   - **Loan EMI Schedule Table**: Due dates, EMI breakdowns, principal vs interest splits, and remaining balances.
6. **Transactions & Audit Trail (`/transactions`)**
   - Category filtering (All, Debits, Credits), real-time search by ID or title, and CSV export.
7. **Profile & Security (`/profile`)**
   - KYC verification badge, contact chips, RabbitMQ notification preferences, and password settings.

---

## 🚀 Running the UI Locally

From the `fin-ease-ui` directory:

```bash
# 1. Install dependencies (if not already installed)
npm install

# 2. Run the Angular development server
npm start
# or
npx ng serve --open
```

Navigate to: **[http://localhost:4200](http://localhost:4200)**

---

## 🔗 Microservices Connectivity

| Feature | Backend Endpoint | Microservice Port |
| :--- | :--- | :--- |
| **Create Customer & Account** | `POST /api/create` | `http://localhost:8080` |
| **Fetch Account Details** | `GET /api/fetch?mobileNumber=...` | `http://localhost:8080` |
| **Fetch All Customer Details** | `GET /api/fetchCustomerDetails` | `http://localhost:8080` |
| **Issue Card** | `POST /api/create?mobileNumber=...` | `http://localhost:9000` |
| **Fetch Card Details** | `GET /api/fetch?mobileNumber=...` | `http://localhost:9000` |
| **Apply for Loan** | `POST /api/create?mobileNumber=...` | `http://localhost:8090` |
| **Fetch Loan Details** | `GET /api/fetch?mobileNumber=...` | `http://localhost:9000` |
| **Gateway Routing** | `/eazybank/**` | `http://localhost:8072` |
