# Verification

## Automated (`npm run check`, also run in CI)

| Check                | What it covers                                                                                                                                                                                                                                                                                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `eslint .`           | TypeScript and React Hooks rules, type-only imports, ban on `dangerouslySetInnerHTML`                                                                                                                                                                                                                                                                          |
| `prettier --check .` | Consistent formatting and Tailwind class order                                                                                                                                                                                                                                                                                                                 |
| `tsc -b`             | Strict typecheck for the app and the Vite config                                                                                                                                                                                                                                                                                                               |
| `vitest run`         | API client (envelope, 401/403, stale sessions, 5xx masking, DELETE=false, relative paths), base URL validation, session/JWT expiry, utils and CSV escaping, Vietnamese dictionary completeness, and integration flows: login guard, form validation, invalid credentials, dashboard, server pagination, confirm-before-delete, returning to the requested page |
| `vite build`         | Production bundle with CSP meta tag                                                                                                                                                                                                                                                                                                                            |

## Manual smoke test against the live API (Admin account)

1. Sign in and confirm the dashboard counters load. Click **Xuất báo cáo** and check the CSV opens in Excel with correct Vietnamese characters.
2. Users: search, filter by role and status, move to page 2, open a user, edit the profile, and change the role (a confirmation dialog must appear). Disable and then re-enable a test account.
3. Buildings: create a building, edit its coordinates, open the details, add a floor and a room, edit both, delete both, then delete the building.
4. Questions: filter by category, add a question, add, edit and delete an answer, then delete the question.
5. Categories: add, rename and delete. A category that is in use shows how many questions use it.
6. Chats: filter by user ID and date range, open a conversation, delete a message on test data only.
7. Change password with an OTP. The portal must sign out afterwards.
8. Leave the tab idle until the token expires, or revoke the account. The next action must return to the login page.
