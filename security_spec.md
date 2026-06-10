# Security Specification - Inside The Metro

## Data Invariants
1. A User profile can only be managed by the owner of the auth UID.
2. An Event can only be created by an authenticated user.
3. An Event can only be updated/deleted by its creator or an admin.
4. User roles (like 'admin') cannot be self-assigned.
5. Stats can only be incremented, not overwritten arbitrarily.

## The Dirty Dozen Payloads

1. **Identity Theft**: Attempt to create a user profile with a different UID in the body.
2. **Privilege Escalation**: Attempt to set `role: 'admin'` on own profile.
3. **Ghost Field**: Attempt to add `verified: true` to a user-created event.
4. **ID Poisoning**: Attempt to use a 2KB string as a document ID.
5. **Orphaned Writes**: Attempt to save a non-existent event ID (if relational).
6. **PII Leak**: Attempt to list all users' emails as a guest.
7. **Resource Exhaustion**: Attempt to send a 1MB description for an event.
8. **Time Travel**: Attempt to set a past `createdAt` timestamp.
9. **State Shortcut**: Attempt to verify an event without admin rights.
10. **Shadow Update**: Attempt to update an event created by another user.
11. **Bulk Delete**: Attempt to delete the entire events collection.
12. **Traffic Hijack**: Attempt to reset `totalViews` to 0.

## Test Runner Plan
- Verify `PERMISSION_DENIED` for all Dirty Dozen payloads.
- Verify `ALLOWED` for legitimate metropolitan signals.
