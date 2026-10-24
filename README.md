# EasyBank Spring Boot Microservices

A production-grade, event-driven banking microservices application built with Spring Boot, Spring Cloud, RabbitMQ, Redis, and Keycloak.

## Quick Links

- 💻 **Frontend Angular Web UI**: [fin-ease-ui](./fin-ease-ui) (Angular + Angular Material)
- 📐 **Architecture & Request Flow (0 to Hero)**: [ARCHITECTURE_AND_REQUEST_FLOW.md](./ARCHITECTURE_AND_REQUEST_FLOW.md)
- 📖 **Local IDE Setup & Run Guide**: [RUN_LOCAL_IDE.md](./RUN_LOCAL_IDE.md)
- 🐳 **Infrastructure Docker Compose**: [docker-compose-infra.yml](./docker-compose-infra.yml)
- 🐳 **Full Docker Compose Environments**:
  - [docker-compose/default/docker-compose.yml](./docker-compose/default/docker-compose.yml)
  - [docker-compose/qa/docker-compose.yml](./docker-compose/qa/docker-compose.yml)
  - [docker-compose/prod/docker-compose.yml](./docker-compose/prod/docker-compose.yml)

## Microservices Architecture

1. **Config Server** (`8071`): Centralized external configuration repository management.
2. **Eureka Server** (`8070`): Service registration and discovery registry.
3. **Accounts Service** (`8080`): Core banking account management and RabbitMQ event publisher.
4. **Loans Service** (`8090`): Customer loan management with Resilience4j circuit breakers & retries.
5. **Cards Service** (`9000`): Credit/debit card management.
6. **Message Service** (`9010`): Event-driven asynchronous notification consumer via RabbitMQ.
7. **Gateway Server** (`8072`): Spring Cloud API Gateway with Redis rate limiting & Keycloak OAuth2 JWT verification.

For complete local setup instructions, see [RUN_LOCAL_IDE.md](./RUN_LOCAL_IDE.md).
