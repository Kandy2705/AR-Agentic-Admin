# Backend contract and boundaries

Source: `Kandy2705/CO4029_BE` (`API/Contracts`). The frontend does not change the backend. Wire types live in `src/types/api.ts`. Endpoint paths are defined only in `src/services/*.service.ts`.

## Wire format

Every JSON response uses `{ success, data, message, errorCode }`. `ApiClient` unwraps `data` and rejects malformed envelopes. An HTTP 200 with `success: false` is treated as an error. A DELETE that returns `data: false` is not treated as a completed deletion.

Admin lists use `{ items, page, pageSize, totalItems, totalPages }` **inside `data`**. Zero is a valid count. `isActive=false` must stay in the query string.

| Feature            | Method and path (after `/api/v1`)                                         | Request/details                                                                      |
| ------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Login              | POST `/users/login`                                                       | `email`, `password`; read `accessToken`, `expiresAt`                                 |
| Session/profile    | GET `/users/me`                                                           | Verify `id`, `role === 'Admin'`, `isActive === true`                                 |
| Profile update     | PUT `/users/update-customer`                                              | `name`, `phone`, `birthday`, `gender`; never role/email                              |
| OTP                | POST `/users/request-password-change`                                     | `email`                                                                              |
| Password           | POST `/users/change-password`                                             | `email`, `oldPassword`, `newPassword`, `otpCode`                                     |
| Dashboard          | GET `/admin/dashboard/summary`                                            | Nine counters; no fabricated trends                                                  |
| User list          | GET `/admin/users`                                                        | `page`, `pageSize`, `search`, `role`, `isActive`                                     |
| User detail/update | GET/PUT `/admin/users/{id}`                                               | Update allows name/phone/birthday/gender/role; no email                              |
| User status        | PATCH `/admin/users/{id}/status`                                          | `{ isActive: boolean }`                                                              |
| Buildings          | GET/POST `/buildings`, GET/PUT/DELETE `/buildings/{id}`                   | Create includes current Admin `userId`; update excludes it                           |
| Floors             | GET/POST `/buildings/{id}/floors`, PUT/DELETE `/floors/{id}`              | `floorNumber`, `name`, `floorPlanUrl`, `sourceUrl`, `verified`                       |
| Rooms              | GET/POST `/floors/{id}/rooms`, PUT/DELETE `/rooms/{id}`                   | `roomCode`, `name`, `description`, `roomType`, `localX/Y/Z`, `sourceUrl`, `verified` |
| Categories         | GET/POST `/contacts/categories`, PUT/DELETE `/contacts/categories/{id}`   | `{ name }`                                                                           |
| Questions          | GET/POST `/contacts/questions`, GET/PUT/DELETE `/contacts/questions/{id}` | `content`, `name`, `email`, `categoryId`, `createDate`, `userId`                     |
| Category filter    | GET `/contacts/questions/categories/{id}`                                 | Real backend filter path, not a query parameter                                      |
| Question answers   | GET `/contacts/questions/{id}/answers`                                    | Answers for one question                                                             |
| Answers            | POST `/contacts/answers`, PUT/DELETE `/contacts/answers/{id}`             | `content`, **`createdDate`**, `questionId`, `userId`                                 |
| Chat histories     | GET `/admin/chat/histories`                                               | `page`, `pageSize`, `userId`, `fromDate`, `toDate`                                   |
| Messages           | GET `/chat/chatboxes/history/{historyId}`                                 | Messages for one conversation                                                        |
| Delete history     | DELETE `/chat/histories/{id}`                                             | Deletes the conversation and its messages                                            |
| Delete message     | DELETE `/chat/chatboxes/{id}`                                             | Requires explicit confirmation                                                       |

## Naming differences

- The answer response uses `createDate`; the create/update request uses `createdDate`. Edits keep the original author and timestamp.
- `create_date`, `contact_time` and `contact_person` keep their underscores in JSON.
- A History is a conversation. A Chatbox record is shown as a message. The UI displays the real `contact_person` string and does not invent user/assistant roles.
- A missing coordinate stays `null`, not zero. Zero is still a valid coordinate. The same applies to room local X/Y/Z.
- When a user update sends `birthday: null`, the backend keeps the existing value. The form says this instead of offering to clear the field.

## Authentication and privacy

Only the access token and its optional expiry are stored, in the current tab's `sessionStorage`. There is no refresh or logout endpoint, so when the token expires the admin signs in again, and logging out clears only the local session. A 401 or 403 from any request ends the session. The current account is re-checked on window focus and every 60 seconds. The backend remains the security boundary.

The frontend blocks an admin from disabling their own account or changing their own role. These are UX safeguards only. Protecting the last active Admin is still the backend's job.

## Pagination and limitations

Users and chat histories use server pagination (20 per page) and backend filters. Buildings, categories and questions are returned as plain arrays, so search and pagination for them happen in the browser. Add a paginated endpoint before these modules grow large.

No APIs were invented for: creating or hard-deleting users, image upload, question workflow status, access statistics, error logs, user feedback, or refresh tokens. See `docs/ARCHITECTURE.md` §2.
