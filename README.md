# EasyBank / FinEase: Spring Boot Microservices Banking Platform

A production-grade, event-driven digital banking microservices platform built with **Spring Boot 3**, **Spring Cloud**, **RabbitMQ**, **Redis**, **Keycloak IAM**, and an **Angular 22** frontend (`fin-ease-ui`).

---

## 📚 Essential Guides & Documentation

- 📐 **Architecture & Request Flow (0 to Hero)**: [ARCHITECTURE_AND_REQUEST_FLOW.md](./ARCHITECTURE_AND_REQUEST_FLOW.md) — Comprehensive deep-dive into Keycloak IAM sync, PKCE authentication, OpenFeign synchronous aggregation, and RabbitMQ messaging.
- 📖 **Local IDE Setup & Run Guide**: [RUN_LOCAL_IDE.md](./RUN_LOCAL_IDE.md) — Step-by-step instructions to run and debug all microservices in IntelliJ IDEA, Eclipse, or VS Code.
- 💻 **Frontend Web Application**: [fin-ease-ui](./fin-ease-ui) — Modern Angular SPA with Material Design, reactive signals, and real-time banking dashboards.
- 🐳 **Infrastructure Docker Compose**: [docker-compose-infra.yml](./docker-compose-infra.yml) — Quick launch for RabbitMQ, Redis, and Keycloak containers.
- 🐳 **Full Docker Environments**:
  - [docker-compose/default/docker-compose.yml](./docker-compose/default/docker-compose.yml)
  - [docker-compose/qa/docker-compose.yml](./docker-compose/qa/docker-compose.yml)
  - [docker-compose/prod/docker-compose.yml](./docker-compose/prod/docker-compose.yml)

---

## 🌐 System Architecture & Ports Matrix

| Component | Port | Health / Swagger / Management | Key Responsibilities |
| :--- | :--- | :--- | :--- |
| **FinEase UI** | `4200` | [http://localhost:4200](http://localhost:4200) | Angular 22 Single Page Application, OIDC PKCE & Direct Grant client, reactive signals |
| **Keycloak IAM** | `7080` | [http://localhost:7080](http://localhost:7080) | Identity provider: Realm `eazybank`, client `finease-ui`, admin client `backend-admin-client` |
| **Config Server** | `8071` | [http://localhost:8071/actuator/health](http://localhost:8071/actuator/health) | Centralized Git/file-based configuration management |
| **Eureka Server** | `8070` | [http://localhost:8070](http://localhost:8070) | Service registry and dynamic instance discovery |
| **API Gateway** | `8072` | [http://localhost:8072/actuator/gateway/routes](http://localhost:8072/actuator/gateway/routes) | Edge reverse proxy, OAuth2 Resource Server, Redis rate limiting, circuit breaker |
| **Accounts Service** | `8080` | [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html) | Customer accounts, OpenFeign aggregator (`fetchCustomerDetails`), RabbitMQ event producer |
| **Cards Service** | `9000` | [http://localhost:9000/swagger-ui.html](http://localhost:9000/swagger-ui.html) | Credit/Debit card management, balances, and credit limit tracking |
| **Loans Service** | `8090` | [http://localhost:8090/swagger-ui.html](http://localhost:8090/swagger-ui.html) | Personal/Home loans, installment tracking, interest calculation |
| **Message Service** | `9010` | RabbitMQ Stream Consumer | Asynchronous email & SMS notification pipeline via Spring Cloud Function |
| **RabbitMQ** | `5672` / `15672` | [http://localhost:15672](http://localhost:15672) | Event broker with exchanges: `send-communication` and `communication-sent` |
| **Redis** | `6379` | — | High-performance token bucket rate limiting at API Gateway |

---

## ⚡ Core Features & Workflows

### 1. Dynamic User Onboarding & Keycloak IAM Sync
- When a user signs up on `/signup`:
  1. **Core Banking Creation**: `POST /eazybank/accounts/api/create` creates customer and savings account in the `accounts` database.
  2. **Automated IAM Sync**: The UI communicates with Keycloak Admin REST API using `backend-admin-client` (`grant_type=client_credentials`) to create the user, set password credentials, and assign realm roles (`USER`, `ACCOUNTS`, `CARDS`, `LOANS`).
  3. **Immediate Login Readiness**: The newly registered user can immediately log in via Keycloak OIDC SSO or in-app direct credentials.

### 2. Dual Authentication Strategy
- **OIDC Authorization Code Flow with PKCE (RFC 7636)**: Standard SSO redirect flow using Keycloak login screen. Equipped with single-use code replay protection (`cleanUrlParams()` and `PROCESSED_CODE_KEY`) to prevent `400 invalid_grant: Code not valid` errors on browser refresh.
- **Direct Access Grant (Resource Owner Password)**: Seamless in-app login using username/email and password against Keycloak's token endpoint (`client_id=finease-ui`).

### 3. Real-Time Customer Dashboard Aggregation (`fetchCustomerDetails`)
- When viewing the dashboard, creating a new card (`/cards`), or sanctioning a loan (`/loans`):
  - The UI requests `GET /eazybank/accounts/api/fetchCustomerDetails?mobileNumber=...` via the API Gateway.
  - `accounts:8080` uses **Spring Cloud OpenFeign** to synchronously fetch card details from `cards:9000` and loan details from `loans:8090`.
  - The consolidated `CustomerDetailsDto` is enriched with dynamic display attributes (`cardHolder`, `status`, `emi`, `nextDueDate`) and stored in reactive Angular signals (`accounts()`, `cards()`, `loans()`, `overview()`).
  - Reloading the page smoothly restores user state and displays all accounts, cards, and loans in real-time.

### 4. Asynchronous Event-Driven Messaging (RabbitMQ)
- New account creations trigger an asynchronous notification event via Spring Cloud Stream's `StreamBridge`.
- `message:9010` consumes the event via composed functions `email|sms`, dispatches simulated customer notifications, and emits a confirmation back to RabbitMQ.
- `accounts:8080` receives the callback and updates `communication_sw = true` in the database.

### 5. Edge Security & Role-Based Access Control (RBAC)
- **API Gateway (Port 8072)** acts as an OAuth2 Resource Server validating JWT signatures using Keycloak's cryptographic public keys (JWKS).
- `KeyclockRoleConverter` extracts realm roles (`ADMIN`, `MANAGER`, `USER`) and client resource roles (`ACCOUNTS`, `CARDS`, `LOANS`) into Spring Security authorities.
- Onboarding endpoints (`/accounts/api/create`, `/accounts/api/fetchCustomerDetails`, `/cards/api/create`, `/loans/api/create`) are granted public passthrough in `SecurityConfig.java` to guarantee zero-friction onboarding.

---

## 🚀 Quick Start Guide

### Step 1: Start Infrastructure Containers
Run the lightweight Docker Compose file to bring up RabbitMQ, Redis, and Keycloak:
```powershell
docker compose -f docker-compose-infra.yml up -d
```
Verify that all containers are healthy:
```powershell
docker compose -f docker-compose-infra.yml ps
```

### Step 2: Start Spring Cloud Microservices
Start the services in the following order in your IDE or terminal:
1. `configserver` (Port `8071`) — Wait until initialized.
2. `eurekaserver` (Port `8070`) — Wait until dashboard is accessible at `http://localhost:8070`.
3. `gatewayserver` (Port `8072`) — API Gateway and edge security.
4. `accounts` (Port `8080`), `cards` (Port `9000`), `loans` (Port `8090`).
5. `message` (Port `9010`) — RabbitMQ event consumer.

### Step 3: Start FinEase Web UI
In a terminal, navigate to `fin-ease-ui` and start the Angular development server:
```powershell
cd fin-ease-ui
npm install
npm start
```
The application will be live at **`http://localhost:4200`**.

---

## 🧪 Testing the End-to-End Workflow

1. **Sign Up**: Navigate to `http://localhost:4200/signup`. Enter your name, email, and a unique 10-digit mobile number (e.g., `9123456789`) with a password.
2. **Verify Keycloak Sync**: Check Keycloak Admin Console at `http://localhost:7080` (Realm: `eazybank` $\rightarrow$ Users). Your user will appear with roles `USER`, `ACCOUNTS`, `CARDS`, and `LOANS`.
3. **Card & Loan Creation**: 
   - Go to **Cards** (`/cards`) and click **"Apply for Card"**.
   - Go to **Loans** (`/loans`) and submit a new loan application.
4. **Dashboard Reload & Aggregation**:
   - Navigate to **Dashboard** (`/dashboard`) or press `F5` / reload the browser.
   - The application automatically calls `fetchCustomerDetails` with your mobile number, pulling live records from `accounts`, `cards`, and `loans` microservices and rendering your complete portfolio seamlessly.

---

## 📄 License
This project is open-source and intended for educational and enterprise architectural demonstration.
