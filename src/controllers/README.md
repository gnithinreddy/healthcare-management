# Controllers (MVC - Controller)

API route handlers in `app/api/` act as the controller layer. They:

1. Receive HTTP requests
2. Validate authentication (cookies)
3. Call services for business logic
4. Return JSON responses

Flow: **Request → Controller (API route) → Service → Model (Prisma) → Response**
