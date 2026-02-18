# Ecommerce Platform (Microservices)

Production-oriented e-commerce platform starter built with Java 17, Spring Boot 3.2, Spring Cloud 2023, React 18, PostgreSQL, Redis, RabbitMQ, and Zipkin.

## Services
- `api-gateway`: single entry point, auth enforcement, routing, rate limiting, circuit breaker
- `eureka-server`: service registry/discovery
- `config-server`: centralized externalized config (`config-repo`)
- `user-service`: JWT auth, RBAC, users
- `product-service`: catalog/search/inventory + websocket stock updates
- `cart-service`: Redis-backed carts
- `order-service`: order processing + async events
- `payment-service`: payment processing + async events
- `admin-service`: analytics APIs
- `notification-service`: consumes events and sends notifications
- `frontend`: React + TypeScript + Tailwind web UI

## Quick Start
1. Build backend modules:
   - `mvn -T 1C clean package -DskipTests`
2. Start platform:
   - `docker compose up --build`
3. Open:
   - Gateway: `http://localhost:8080`
   - Eureka: `http://localhost:8761`
   - Zipkin: `http://localhost:9411`
   - Frontend: `http://localhost:5173`

## Security Features
- JWT-based authentication (issued by user-service)
- Role-based access control (`ROLE_USER`, `ROLE_ADMIN`)
- API gateway rate limiting (Redis)
- CORS and security headers
- Circuit breaker + retry (Resilience4j)

## High Availability Patterns
- Service discovery via Eureka
- Gateway routing + load-balanced URIs
- Health checks on all services
- Async communication via RabbitMQ
- Distributed tracing with Zipkin
- Stateless services (horizontal scaling ready)

## Notes
- This repository is a production-grade foundation template. Integrations like external payment provider credentials, SMTP, and advanced recommendation models are scaffolded with extension points.
- Per-service database pattern is implemented in Docker Compose via isolated PostgreSQL instances.
