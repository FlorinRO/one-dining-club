# One Dining Club

Foundation for a food delivery MVP with a Django REST backend and an Expo React Native customer app.

## Structure

- `backend/` - Django, Django REST Framework, JWT auth, admin, PostgreSQL-ready settings.
- `mobile/` - Expo SDK 54, React Native, TypeScript, React Navigation, Axios, Zustand.

## Backend

```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_demo
python manage.py runserver
```

Useful demo users after `seed_demo`:

- Customer: `demo@onedining.club` / `password123`
- Restaurant owner: `owner@onedining.club` / `password123`

The backend defaults to SQLite if `DATABASE_URL` is not set. For the intended MVP setup, set `DATABASE_URL` to PostgreSQL in `backend/.env`.

## Mobile

```bash
cd mobile
nvm use
npm install
npm run start
```

Set `EXPO_PUBLIC_API_URL` when the app needs a different backend URL:

```bash
EXPO_PUBLIC_API_URL=http://localhost:8000/api npm run start
```

On a physical phone, use the computer LAN IP instead of `localhost`.

## MVP API

- Auth: `/api/auth/register/`, `/api/auth/login/`, `/api/auth/logout/`, `/api/auth/me/`
- Restaurants: `/api/restaurants/`, `/api/restaurants/{id}/`, `/api/restaurants/{id}/products/`, `/api/restaurants/{id}/categories/`
- Products: `/api/products/`, `/api/products/{id}/`
- Addresses: `/api/addresses/`, `/api/addresses/{id}/set-default/`
- Orders: `/api/orders/`, `/api/orders/{id}/`, `/api/orders/{id}/cancel/`
- Restaurant owner: `/api/restaurant-owner/orders/`, `/api/restaurant-owner/products/`
- Courier-ready: `/api/courier/orders/`, `/api/courier/location/`
