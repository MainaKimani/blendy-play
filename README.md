# Blendy Studio: the Blendy Play portal

The public website for Blendy Play, plus a signed-in area for customers and
the admin. Angular 19, deployed as a static site that calls the Blendy Play
backend (`mk-flix-be`).

| Path | Who | What |
|---|---|---|
| `/` | Everyone | Product page: what Blendy Play is, screenshots on phone, TV and desktop, and the downloads |
| `/signin`, `/admin` | Everyone | One sign-in. The admin lands on the dashboard; anyone else lands on their own account |
| `/account` | Any signed-in user | Their subscription and details (editable), their payments, password change and account deletion |
| `/dashboard` | Super-admin only | Overview, Users, Payments, Subscriptions |

Who counts as the admin is decided by the backend: an account with
`is_superuser` (create one with `python manage.py createsuperuser`). The
dashboard API refuses everyone else with 403, and the portal sends them to
`/account`.

## Run it locally

```sh
npm install
npx ng serve            # http://localhost:4200
```

It talks to the backend named in `public/config.json`
(`http://localhost:8000/api` by default), so run `mk-flix-be` alongside it.

## Configuration

`public/config.json` is read when the page loads, not at build time, so one
build works against any backend:

```json
{
  "apiBase": "https://api.example.com/api",
  "supportEmail": "blendyplay@mainakimani.com"
}
```

On the backend, add the portal's address to `CORS_ALLOWED_ORIGINS` in
`mk-flix-be/.env` (for example `https://blendyplay.example.com`), or the
browser blocks its API calls.

## Deploy

```sh
npx ng build            # output in dist/blendy-studio/browser
```

Upload `dist/blendy-studio/browser` to any static host, then:

1. Replace `config.json` there with the production values.
2. Send unknown paths to `index.html` so `/account`, `/admin` and
   `/dashboard` load on refresh. For nginx:

   ```nginx
   location / {
     try_files $uri $uri/ /index.html;
   }
   ```

   Netlify and Cloudflare Pages: a `_redirects` file with `/* /index.html 200`.
   Vercel: a rewrite of `/(.*)` to `/index.html`.
3. Serve it over HTTPS. Sign-in sends passwords and the session tokens
   live in the browser's localStorage.

## Downloads and screenshots

- `public/downloads/`: the APK and desktop installers, described by
  `releases.json`. The binaries are git-ignored; copy them in when you deploy.
  See `public/downloads/README.md`.
- `public/screenshots/`: the product page gallery, listed in
  `screenshots.json`. See `public/screenshots/README.md`.

## Design

Same neon identity as the apps' account gate: pure black, the gate's card
greys, and the mark's cyan, magenta and red. Headings and body use Ubuntu,
the font of the app's wordmark. Chart fills use deeper steps of the same
hues (`--chart-*` in `src/styles.scss`), checked for contrast and
colour-blind separation on the dark cards; revenue uses M-Pesa green.
