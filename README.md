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
python manage.py runserver 0.0.0.0:8000
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
npx expo start -c --lan
```

Set `EXPO_PUBLIC_API_URL` when the app needs a different backend URL:

```bash
EXPO_PUBLIC_API_URL=http://192.168.0.141:8000/api npx expo start -c --lan
```

On a physical phone, use the computer LAN IP instead of `localhost`/`127.0.0.1`.

### Social login

Copy `mobile/.env.example` to `mobile/.env` and fill the OAuth client IDs:

```bash
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
EXPO_PUBLIC_FACEBOOK_CLIENT_ID=...
```

Google needs OAuth client IDs from Google Cloud Console for the platforms you test. Facebook needs a Meta app ID, and the mobile app must be allowed to use the `fb<FACEBOOK_CLIENT_ID>` URL scheme; `app.config.ts` adds that scheme automatically when `EXPO_PUBLIC_FACEBOOK_CLIENT_ID` is set.

After changing these values, restart Expo with cache clear:

```bash
npx expo start -c --lan
```

## MVP API

- Auth: `/api/auth/register/`, `/api/auth/login/`, `/api/auth/refresh/`, `/api/auth/logout/`, `/api/auth/me/`
- Password reset: `/api/auth/password-reset/`, `/api/auth/password-reset/confirm/`
- Restaurant categories: `/api/restaurant-categories/`
- Restaurants: `/api/restaurants/`, `/api/restaurants/{id}/`, `/api/restaurants/{id}/products/`, `/api/restaurants/{id}/categories/`
- Products: `/api/products/`, `/api/products/{id}/`
- Addresses: `/api/addresses/`, `/api/addresses/{id}/set-default/`
- Orders: `/api/orders/`, `/api/orders/{id}/`, `/api/orders/{id}/cancel/`
- Restaurant owner: `/api/restaurant-owner/orders/`, `/api/restaurant-owner/products/`
- Courier-ready: `/api/courier/orders/`, `/api/courier/location/`

Useful restaurant filters: `search`, `city`, `category`, `categories`, `category_name`, `min_rating`,
`max_delivery_fee`, `max_delivery_time`, `min_order_lte`, `has_offer`, `supports_pickup`,
`lat`, `lng`, `max_distance_km`, `ordering`.

Useful product filters: `search`, `restaurant`, `category`, `is_available`, `is_popular`,
`min_price`, `max_price`, `has_discount`, `max_preparation_time`, `category_name`,
`restaurant_city`, `exclude_allergens`, `ordering`.
