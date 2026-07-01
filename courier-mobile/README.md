# YUMZY Courier Mobile

Separate Expo app for courier operations, kept inside the `one-dining-club` repository and connected to the existing Django backend.

## Local development

1. Install dependencies:
   `npm install`
2. Start the backend locally from the repository root:
   `backend/.venv/bin/python backend/manage.py runserver`
3. Start the courier app:
   `npm start`

## API configuration

- By default, development uses `http://127.0.0.1:8000/api` on simulators.
- On a physical device, Expo host IP is inferred automatically.
- You can override the API target explicitly:
  `EXPO_PUBLIC_API_URL=http://<your-local-ip>:8000/api npm start`

## Current scope

- Courier-only login
- Live board for available pickup orders
- Active delivery flow: `picked_up`, `on_the_way`, `delivered`
- My deliveries with active and completed sections
- Courier availability and live location updates
