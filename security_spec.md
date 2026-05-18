# Security Specification: Nine Talent Management

## 1. Data Invariants
- **Hosts**: Only Directors and Head Admins can create or delete hosts. Hosts can only update their own profile fields that are not immutable (like position or tier).
- **Commissions**: Read-only for hosts (restricted to their own data). Writable ONLY by Director.
- **PK/Exposure/Health**: Writable by Leadership (Director/Admin) and sometimes by the host themselves if it pertains to their own data (though typically these are "submitted" logs).
- **Calendar**: Visible based on `visibility` field. `Director Only` events are hidden from everyone but the Director.

## 2. The Dirty Dozen Payloads (TargetingLogic Leaks)

| ID | Collection | Action | Payload (Malicious Intent) | Expected Result |
|----|------------|--------|----------------------------|-----------------|
| 1 | `hosts` | `create` | `{ "id": "123", "position": "Director" }` by unauthorized user | `PERMISSION_DENIED` |
| 2 | `hosts` | `update` | `{ "position": "Director" }` by a Talent host to escalate privilege | `PERMISSION_DENIED` |
| 3 | `commissions` | `update` | `{ "my_commission": 999999 }` by a host on their own record | `PERMISSION_DENIED` |
| 4 | `commissions` | `list` | `getDocs(collection(db, 'commissions'))` without filter | `PERMISSION_DENIED` |
| 5 | `calendar` | `get` | Fetching a `visibility: 'Director Only'` event as a Talent | `PERMISSION_DENIED` |
| 6 | `hosts` | `create` | `{ "id": "VERY_LONG_ID..." }` (Resource Poisoning) | `PERMISSION_DENIED` |
| 7 | `hosts` | `update` | `{ "id": "changed_id" }` (ID Poisoning) | `PERMISSION_DENIED` |
| 8 | `commissions` | `create` | `{ "poppo_id": "other_host", "month": "2024-05" }` by a host | `PERMISSION_DENIED` |
| 9 | `hosts` | `update` | `{ "extra_field": "hacking" }` (Shadow Update) | `PERMISSION_DENIED` |
| 10 | `fanbase_health` | `create` | `{ "hostId": "123", "subscribers": -100 }` (Invalid range) | `PERMISSION_DENIED` |
| 11 | `tasks` | `update` | `{ "assignedBy": "Director" }` by the host assignee | `PERMISSION_DENIED` |
| 12 | `calendar` | `create` | `{ "visibility": "All", "created_by_role": "Director" }` by a Talent | `PERMISSION_DENIED` |

## 3. Implementation Policy
- **Admin**: `jwavpr@gmail.com` is the system bootstrap admin.
- **Verification**: `request.auth.token.email_verified == true` is required for all writes.
- **Relational Sync**: Commissions and Records must correspond to active hosts.
