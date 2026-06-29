# One Dining Club

Foundation for a food delivery MVP with a Django REST backend and an Expo React Native customer app.

## Structure

- `backend/` - Django, Django REST Framework, JWT auth, admin, PostgreSQL-ready settings.
- `mobile/` - Expo SDK 54, React Native, TypeScript, React Navigation, Axios, Zustand.
- `landing/` - static YUMZY landing page, standalone from mobile and backend.

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

- Customer: `demo@yumzy.ro` / `password123`
- Restaurant owner Pizzeria Napoli: `owner@yumzy.ro` / `password123`
- Other restaurant owners: `owner+restaurant-slug@yumzy.ro` / `password123`

The backend defaults to SQLite if `DATABASE_URL` is not set. For the intended MVP setup, set `DATABASE_URL` to PostgreSQL in `backend/.env`.

### Media uploads / R2

Local development uses `backend/media/`. Production should use Cloudflare R2 through the Railway-hosted backend:

```bash
MEDIA_STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_PUBLIC_URL=https://media.yumzy.ro
R2_MEDIA_LOCATION=media
```

Dashboard uploads should hit the same backend as the app. For the live backend, open the local dashboard with:

```text
http://127.0.0.1:5173/dashboard/?api=prod
```

or:

```text
http://127.0.0.1:5173/dashboard/?api=https://api.yumzy.ro/api
```

For Google address autocomplete in the dashboard, append a Maps JavaScript API key once and it will be stored in localStorage:

```text
http://127.0.0.1:5173/dashboard/?api=prod&googleMapsApiKey=YOUR_KEY
```

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

## Landing

```bash
cd landing
python3 -m http.server 5173
```

Open `http://127.0.0.1:5173`.

### Social login

Copy `mobile/.env.example` to `mobile/.env` and fill the OAuth client IDs:

```bash
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
EXPO_PUBLIC_FACEBOOK_CLIENT_ID=...
```

Google needs OAuth client IDs from Google Cloud Console for the platforms you test. Facebook needs a Meta app ID, and the mobile app must be allowed to use the `fb<FACEBOOK_CLIENT_ID>` URL scheme; `app.config.ts` adds that scheme automatically when `EXPO_PUBLIC_FACEBOOK_CLIENT_ID` is set.

For App Store / TestFlight builds, the same variables must exist in the EAS production environment before running `eas build --platform ios --profile production`. Apple Sign In also needs the iOS capability enabled for the `club.onedining.customer` bundle ID, and the backend must allow `APPLE_SIGN_IN_AUDIENCES=club.onedining.customer`.

Apple Sign In should be validated from a native iOS build or TestFlight. Expo Go is not a reliable validation path for the App Store review flow.

After changing these values, restart Expo with cache clear:

```bash
npx expo start -c --lan
```

### Payments

Stripe checkout scaffolding is wired for card, Apple Pay, and Google Pay.

Backend values to fill in `backend/.env`:

```bash
STRIPE_SECRET_KEY=sk_live_or_test_...
STRIPE_PUBLISHABLE_KEY=pk_live_or_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MERCHANT_DISPLAY_NAME=YUMZY
STRIPE_MERCHANT_COUNTRY_CODE=RO
STRIPE_CURRENCY=ron
```

Mobile values to fill in `mobile/.env` or the EAS environment:

```bash
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_or_test_...
EXPO_PUBLIC_STRIPE_MERCHANT_IDENTIFIER=merchant.com.onediningclub
EXPO_PUBLIC_STRIPE_MERCHANT_COUNTRY_CODE=RO
EXPO_PUBLIC_STRIPE_CURRENCY_CODE=RON
EXPO_PUBLIC_STRIPE_MERCHANT_DISPLAY_NAME=YUMZY
EXPO_PUBLIC_STRIPE_RETURN_URL=onediningclub://stripe-redirect
```

Backend endpoints added for the flow:

- `POST /api/payments/checkout/` creates the order and prepares a Stripe `PaymentIntent` for online payments.
- `POST /api/payments/stripe/webhook/` syncs Stripe events back into `payment_status`.

Apple Pay and Google Pay still need to be enabled in Stripe and in the native app capabilities before production testing.

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
