# Dairy Management App (Angular + Node + MySQL)

Full-stack dairy management application with:

- Angular frontend (responsive Bootstrap UI, auth, dashboard, customers, milk, reports, payments)
- Node.js + Express backend (JWT auth with roles, REST APIs)
- MySQL database (auto table creation and default admin seed)

## Project Structure

```text
DairyApp/
  frontend/   # Angular app
  backend/    # Node.js API + MySQL integration
```

## Backend Setup

1. Go to backend:
   - `cd backend`
2. Install dependencies:
   - `npm install`
3. Copy environment file:
   - `copy .env.example .env`
4. Set MySQL credentials in `.env`.
5. Start server:
   - `npm run dev`

Backend runs on `http://localhost:5000` by default.

Default login:

- Username: `Ashu.M`
- Password: `123`

## Frontend Setup

1. Go to frontend:
   - `cd frontend`
2. Install dependencies:
   - `npm install`
3. Start app:
   - `npm start`

Frontend runs on `http://localhost:4200`.

## API Endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (protected)

### Customers (protected)

- `GET /api/customers`
- `POST /api/customers`
- `PUT /api/customers/:id`
- `DELETE /api/customers/:id`

### Milk Collection (protected)

- `GET /api/milk`
- `POST /api/milk`
- `DELETE /api/milk/:id`

### Payments (protected)

- `GET /api/payments`
- `POST /api/payments`

### Reports (protected)

- `GET /api/reports/summary`
- `GET /api/reports/daily`
- `GET /api/reports/monthly`
- `GET /api/reports/customer`
