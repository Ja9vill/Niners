---
name: testing-niners-dashboard
description: Test the Niners talent management dashboard end-to-end. Use when verifying UI changes, bug fixes, or new features across the authenticated dashboard pages.
---

# Testing the Niners Dashboard

## Environment

- **Production URL**: https://9poppo.com
- **Preview deploys**: Firebase Hosting generates preview URLs per PR (check CI comments for the URL)
- **Auth mechanism**: Custom auth via `PoppoAuthService` stored in `sessionStorage` under key `nine_auth`

## Simulating Authentication (No Real Credentials)

If no test credentials are available, inject a fake auth state via browser console:

```js
sessionStorage.setItem('nine_auth', JSON.stringify({
  level: 3,
  role: "director",  // Options: host, admin, head admin, director, manager, agent
  name: "Test User",
  poppo_id: "99999",
  nickname: "TestNick",
  status: "active",
  manager_assigned: "",
  anchor_team: "",
  profile_photo: "",
  token: "fake-test-token-123"
}));
```

Then navigate to any authenticated route. The UI will render but Firestore operations will fail with permission-denied (expected).

**Important**: `RequireAuth` checks `authState.token` is non-empty AND `authState.level > 0`. Both must be set.

## Key Test Pages

| Route | Component | What to verify |
|-------|-----------|---------------|
| `/` | RootIndex / PublicLanding | Unauthenticated: shows landing. Authenticated: redirects to `/overview` |
| `/overview` | DashboardLayout + Overview | Layout renders, sidebar nav works, no console ReferenceErrors |
| `/streams` | StreamsPage | PK/Livestream/Fanbase tabs load, forms render, info modal (createPortal) works |
| `/calendar` | CalendarTab | Calendar grid renders, events load from Firestore |
| `/roster` | Roster | Host list loads |
| `/events` | CalendarTab (alias) | Same as /calendar |

## Role-Based Access

Different roles see different UI:
- **director**: Full access including Director's Hub (Blog Posts, Reporting, Notification Center, Database)
- **admin/head admin**: Administrative access
- **host**: Limited to own reports and profile
- **agent/manager**: Manages assigned hosts

To test role-based features, change the `role` field in the injected auth state.

## What to Check

1. **No JavaScript crashes**: Check console for TypeError/ReferenceError (ignore Firestore permission-denied with fake auth)
2. **Navigation**: Verify sidebar links work, redirects happen correctly
3. **Form rendering**: All input fields present, submit buttons disabled until required fields filled
4. **Modals**: Test createPortal modals (e.g., PK Calculation Info button on Streams page)
5. **Console warnings**: Fix #8 logs `[DEPRECATION]` for legacy `panticipantids` fields — verify these fire on Calendar page

## Devin Secrets Needed

For full end-to-end testing with real Firestore operations:
- `NINERS_TEST_POPPO_ID`: A test account Poppo ID
- `NINERS_TEST_PASSWORD`: Password for the test account

Without these, testing is limited to UI rendering verification via simulated auth.

## Lint / Build Commands

- Lint (TypeScript check): `npm run lint` (runs `tsc --noEmit`)
- Build: `npm run build`
- Dev server: `npm run dev`
- No test suite configured
