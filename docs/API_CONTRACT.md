# Backend contract and boundaries

Source: `Kandy2705/CO4029_BE`, master commit `60fc4c2c42989a6c3bf5e1036b96d1537d58ad92` as inspected during implementation. No backend source was changed by this task. The live Azure Swagger could not be fetched from the implementation environment, so source DTOs and facades are the integration basis, not a verified deployed schema.

## Wire format

Every successful JSON request uses `{ success: true, data: T, message, errorCode }`. The frontend unwraps `data`, rejects a malformed envelope, and does not treat an HTTP 200 with `success: false` as success. A DELETE returning `data: false` is not treated as a completed deletion.

Admin lists use `{ items, page, pageSize, totalItems, totalPages }` **inside `data`**. Zero is a valid count and `isActive=false` must not disappear from query parameters.

| Feature | Method and path (after `/api/v1`) | Request/details |
| --- | --- | --- |
| Login | POST `/users/login` | `email`, `password`; read `accessToken`, `expiresAt` |
| Session/profile | GET `/users/me` | Verify `id`, `role === 'Admin'`, `isActive === true` |
| Profile update | PUT `/users/update-customer` | `name`, `phone`, `birthday`, `gender`; never role/email |
| OTP | POST `/users/request-password-change` | `email` |
| Password | POST `/users/change-password` | `email`, `oldPassword`, `newPassword`, `otpCode` |
| Dashboard | GET `/admin/dashboard/summary` | Nine supplied counters; no fabricated trends |
| User list | GET `/admin/users` | `page`, `pageSize`, `search`, `role`, `isActive` |
| User detail/update | GET/PUT `/admin/users/{id}` | Update allows name/phone/birthday/gender/role; no email |
| User status | PATCH `/admin/users/{id}/status` | `{ isActive: boolean }` |
| Buildings | GET/POST `/buildings`, GET/PUT/DELETE `/buildings/{id}` | Create includes current Admin `userId`; update excludes it |
| Categories | GET/POST `/contacts/categories`, PUT/DELETE `/contacts/categories/{id}` | `{ name }` |
| Questions | GET/POST `/contacts/questions`, GET/PUT/DELETE `/contacts/questions/{id}` | `content`, `name`, `email`, `categoryId`, `createDate`, `userId` |
| Category filter | GET `/contacts/questions/categories/{id}` | Actual backend filter, not an invented query parameter |
| Question answers | GET `/contacts/questions/{id}/answers` | Scoped answer list, not a download of all answers |
| Answers | POST `/contacts/answers`, PUT/DELETE `/contacts/answers/{id}` | `content`, **`createdDate`**, `questionId`, `userId` |
| Chat histories | GET `/admin/chat/histories` | `page`, `pageSize`, `userId`, `fromDate`, `toDate` |
| Messages | GET `/chat/chatboxes/history/{historyId}` | Scoped message list |
| Delete history | DELETE `/chat/histories/{id}` | Deletes the conversation and its messages in BE |
| Delete message | DELETE `/chat/chatboxes/{id}` | Requires explicit confirmation |

## Important naming differences

- `AnswerReponse.createDate` is a response field; `CreateAnswerRequest.createdDate` is a request field. Edits preserve the original author and timestamp.
- `HistoryReponse.create_date` and `ChatboxReponse.contact_time` / `contact_person` keep underscores in JSON.
- A History is the conversation. A Chatbox record is displayed as a message. The UI displays the actual `contact_person` string rather than assigning an invented user/assistant role.
- Building response has no owner, image, publish status, floor, or room fields. A missing coordinate remains null, not zero; zero itself remains a valid coordinate.
- User update treats a null birthday as "keep existing". The form explains this rather than promising a clear action that the backend cannot perform.

## Authentication and privacy

Only the access token and optional expiry are stored in `sessionStorage` for the current tab. Passwords and refresh tokens are not persisted. There is no documented refresh/logout endpoint, so expiry requires signing in again and logout clears the local session only. Password change also clears the local session; global revocation belongs to the backend.

Bearer authentication is added centrally. The API client times out and aborts obsolete reads. Responses from an earlier token generation cannot overwrite data for a later login or log out that later login. A server 401 or 403 clears the Admin session. The current account is revalidated on window focus and periodically, but the backend remains the security boundary.

Tab storage is still readable by scripts on the same origin; it is not equivalent to an HttpOnly cookie. API content is rendered as text, never as raw HTML, and the page uses a CSP without third-party scripts. Deploy over HTTPS, keep this origin free of untrusted scripts, and enforce ownership/roles server-side.

The frontend prevents self-disable and self-role changes as UX safeguards. The inspected backend did not demonstrate a transactional last-Admin guard. That protection and credential rotation remain backend responsibilities.

## Pagination and limitations

Users and histories use server pagination (20 per page) and backend filters. Buildings, categories, and questions currently return arrays; local search/pagination operates only on those returned arrays. If PostgREST or the server caps an array, this UI cannot claim the loaded subset is the entire database. Add a documented paginated endpoint before scaling those modules. Dashboard totals come from the summary endpoint, not array lengths.

No APIs were invented for user hard deletion, image upload, question workflow status, unanswered-question count, reports, error logs, or admin registration. No live production writes were performed during development.
