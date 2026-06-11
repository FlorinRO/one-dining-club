# YUMZY Landing Page

Landing page static pentru YUMZY, separat de aplicația mobilă și backend.

## Preview local

```bash
cd landing
python3 -m http.server 5173
```

Deschide apoi `http://127.0.0.1:5173`.

## Structură

- `index.html` - conținutul paginii
- `styles.css` - design responsive și logo YUMZY replicat din `LoginScreen.tsx`
- `script.js` - animații la scroll și demo pentru formularul de waitlist
- `dashboard/` - dashboard static pentru restaurante, gândit pentru `dashboard.yumzy.ro`
- `assets/` - imagini copiate din aplicația mobilă pentru deploy autonom
