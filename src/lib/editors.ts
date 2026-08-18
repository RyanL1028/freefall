// Who can use the in-app editor (/write).
//
// Add an email here, OR add a Firebase UID to the list below, to grant
// someone editor access. The same list must stay in sync with the worker's
// EDITOR_EMAILS / EDITOR_UIDS environment variables (the worker enforces it).

export const EDITOR_EMAILS = [
  "ryanlwg1028@gmail.com",
  "social.freefall@gmail.com",
];

// Firebase UIDs granted editor access (empty until you add someone).
export const EDITOR_UIDS: string[] = [];

export function isEditor(user: { email?: string | null; uid?: string } | null) {
  if (!user) return false;
  const email = user.email?.toLowerCase() || "";
  return EDITOR_EMAILS.includes(email) || EDITOR_UIDS.includes(user.uid || "");
}
