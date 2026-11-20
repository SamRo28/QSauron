# Theme and authentication notes

## Visual theme (Qumuclient palette)

Tokens are defined in `src/app/styles/variables.css`.

| Token | Value | Use |
|---|---|---|
| Primary green | `#50816f` | Main backgrounds and elements |
| Mint | `#9dc0a9` | Buttons and interactive elements |
| Hover green | `#8ab095` | Hover states |
| Border green | `#718f84` | Borders and dividers |
| Dark grey | `#1f2937` | Main text |
| Medium grey | `#4c5866` | Headers and titles |
| Light background | `#f0f7f3` | Application background |

`ThemeService` toggles light/dark mode.

## Authentication

- The backend sets `SESSION_TOKEN` and `REFRESH_TOKEN` as **HttpOnly cookies**; the browser code never reads the token.
- `auth.interceptor.ts` sends credentials with each request and refreshes the session through `POST /users/refreshToken`.
- `authGuard` protects `/dashboard/**`; `adminGuard` additionally requires an administrator profile (`/dashboard/converter`).
- Backend endpoints used: `/users/create`, `/users/login`, `/users/verify2FACode`, `/users/refreshToken` and the `/recovery/*` family.
