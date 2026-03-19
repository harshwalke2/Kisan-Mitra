# Manual UI Test Checklist (Full Flow)

Date: __________________
Tester: _______________
Environment: Local (frontend `http://localhost:5188`, backend `http://localhost:5055`)

## Test Accounts

Create these during test run:
- User A (Farmer)
- User B (Farmer)
- User C (Farmer, optional for reject flow)
- Admin user

Use unique emails each run.

## 1) App Boot & Navigation

1. Open app homepage.
2. Verify landing page loads without blank sections.
3. Open each major section from navbar and verify it renders.
4. Resize browser to mobile width and verify navigation still works.

Expected:
- No crash/blank page.
- No obvious broken layout.

Pass/Fail: ________
Notes: ______________________________________

## 2) Registration & Login

1. Register User A with full farmer details.
2. Register User B with full farmer details.
3. Logout and login again as User A.
4. Try login with wrong password once.

Expected:
- Valid registration/login works.
- Wrong password shows error message.

Pass/Fail: ________
Notes: ______________________________________

## 3) Forgot Password / Reset Password

1. In login modal, open forgot password.
2. Enter User A email and submit.
3. Use reset link provided in dev response and set new password.
4. Login with new password.

Expected:
- Reset flow completes and new password works.

Pass/Fail: ________
Notes: ______________________________________

## 4) User Search + Follow Flow

1. Login as User A.
2. Search User B.
3. Send follow request.
4. Login as User B.
5. Open pending requests and accept User A request.
6. Optional: repeat with User C and reject request.

Expected:
- Request appears for receiver.
- Accept and reject actions update state correctly.

Pass/Fail: ________
Notes: ______________________________________

## 5) Chat Flow

1. Ensure A and B are connected by follow.
2. Send message A -> B.
3. Login as B and read conversation.
4. Reply B -> A.
5. Verify conversation list updates.

Expected:
- Messages persist and appear in both accounts.
- Conversation list shows latest message.

Pass/Fail: ________
Notes: ______________________________________

## 6) Listing Flow

1. Login as User A.
2. Create a listing (tool or crop) with valid fields.
3. Verify listing appears in marketplace.
4. Open My Listings and verify it appears.
5. Change listing status (active/inactive) and verify update.

Expected:
- Listing create and status updates work.

Pass/Fail: ________
Notes: ______________________________________

## 7) Booking Flow

1. Login as User B.
2. Open User A listing and create booking request.
3. Login as User A and accept booking.
4. Mark booking completed as owner.
5. Try booking own listing once (should fail).

Expected:
- Valid booking flow works end-to-end.
- Own listing booking is blocked.

Pass/Fail: ________
Notes: ______________________________________

## 8) Reviews Flow

1. After completed booking, login as User B.
2. Submit review for User A.
3. Open User A profile and verify rating summary updates.

Expected:
- Review saves and appears in profile summary.

Pass/Fail: ________
Notes: ______________________________________

## 9) Profile & Trust Score

1. Open my profile for A and B.
2. Open public profile view from other user.
3. Verify followers/following and trust score are visible.

Expected:
- Profile data loads correctly.

Pass/Fail: ________
Notes: ______________________________________

## 10) Notifications

1. Trigger events (follow accepted, booking update, review).
2. Open notifications list.
3. Mark one as read.
4. Mark all as read.
5. Delete one notification.

Expected:
- Notification actions work and state updates reflect immediately.

Pass/Fail: ________
Notes: ______________________________________

## 11) Verification (KYC)

1. Login as User A.
2. Submit verification via Aadhaar.
3. Login as admin and review verification as verified/rejected.
4. Re-check User A verification status.

Expected:
- Verification status transitions correctly.

Pass/Fail: ________
Notes: ______________________________________

## 12) Admin Insights

1. Login as admin.
2. Open admin insights page and verify metrics load.
3. Login as farmer and verify admin page is blocked.

Expected:
- Admin sees insights.
- Farmer receives unauthorized access message.

Pass/Fail: ________
Notes: ______________________________________

## 13) Crop Recommendation UI

1. Open crop recommendation page.
2. Enter valid numeric values and submit.
3. Verify recommendation, confidence, and alternatives appear.
4. Enter invalid value and verify error handling.

Expected:
- Valid prediction renders.
- Invalid input shows user-friendly error.

Pass/Fail: ________
Notes: ______________________________________

## 14) Regression Quick Pass

1. Refresh page while logged in.
2. Logout/login cycle once more.
3. Verify no major console errors in browser devtools.

Expected:
- Session behavior is stable.
- No major runtime errors.

Pass/Fail: ________
Notes: ______________________________________

## Final Signoff

- Total sections passed: ______ / 14
- Critical issues found: ______
- Ready for demo/release: Yes / No
