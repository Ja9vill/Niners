# Security Specification: Commission Management

## 1. Data Invariants
- A commission record must contain a valid `poppo_id` and `month`.
- Only the Director can create or update commission records.
- Commission records are derived exclusively from the MasterSheet.
- Commission records are immutable once written, except for replacement by a new MasterSheet.
- No one else can modify or delete commission records.

## 2. The "Dirty Dozen" Payloads
1. Talent attempting to write their own commission.
2. Manager attempting to adjust a host's commission.
3. Admin trying to delete monthly records.
4. Anonymous user trying to read commission data.
5. Director trying to write commission with missing required fields (e.g., no month).
6. Director trying to write commission with invalid types (e.g., string for duration).
7. Attackers trying to inject oversized strings into nickname or poppo_id.
8. Director trying to set a future timestamp for a past month.
9. Malicious actor trying to spoof the 'Director' role in a request.
10. Update attempting to change the poppo_id or month of an existing record.
11. Director trying to write commission with invalid POPPO ID format.
12. Attempt to write a commission record without being authenticated via the approved agency account.

## 3. Test Runner (Conceptual)
All the above payloads MUST return `PERMISSION_DENIED` except when performed by the verified Director.
