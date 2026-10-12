# Hallpass Security Specifications (Phase 0)

## 1. Core Data Invariants
1. **User Identity & Role Partitioning**: A user document at `/users/{uid}` can only be read by the user themselves or by verified admins. Students can never update their own role or other users' profiles.
2. **Allocation Immutability & Privacy**: Student allocations at `/allocations/{allocationId}` are read-only for students, restricted strictly to their own student ID or roll number, and only if `published == true`. Admins have full access. In-charges can view allocations for rooms assigned to them.
3. **Attendance Submission Locking**: Attendance records at `/attendanceSubmissions/{submissionId}` represent finalized legal examination records. Once submitted (`submittedAt` is set), updates are locked unless authorized by an administrator.
4. **Zero-Trust Input Validation**: Document IDs must conform to regex `^[a-zA-Z0-9_\-]+$`. No orphaned allocations may exist without an active examination ID.

## 2. Hardened Rules Pillars
- Zero blanket client writes: All mutations originate through verified Firebase Auth tokens with validated roles.
- Backend token verification enforces role-based access (`admin`, `incharge`, `student`).
- Firestore security rules protect direct client database operations while the Firebase Admin SDK serves privileged batch processes (such as automated room seat allocation with collision prevention).
