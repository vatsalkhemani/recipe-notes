// When set, the app bypasses Firebase auth/storage with a fake local user so the
// UI can be driven in tests/previews without real credentials.
export const E2E_MODE = process.env.NEXT_PUBLIC_E2E_MODE === "true";
