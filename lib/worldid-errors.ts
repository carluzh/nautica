// World ID surfaces errors as snake_case codes — from the IDKit widget (onError) and
// from the verify API (passed through as the server's `reason`). Both are machine-like
// (e.g. "verification_rejected", "max_verifications_reached"). This turns them into
// readable, user-facing text; unknown codes are de-snake-cased so an underscore never
// reaches a toast, and already-human sentences are left as-is.

const MESSAGES: Record<string, string> = {
  verification_rejected: "Verification cancelled.",
  user_cancelled: "Verification cancelled.",
  failed_by_host_app: "Verification couldn't be completed. Please try again.",
  generic_error: "Something went wrong during verification. Please try again.",
  already_signed: "You've already verified for this.",
  max_verifications_reached: "This World ID has already verified the maximum number of times here.",
  credential_unavailable: "You don't have the required World ID credential yet.",
  invalid_proof: "That World ID proof couldn't be verified. Please try again.",
  invalid_merkle_root: "Your World ID needs a moment to sync. Please try again shortly.",
  invalid_network: "World App is on a different network. Switch networks and try again.",
  malformed_request: "The verification request was invalid. Please try again.",
  inclusion_proof_failed: "World ID couldn't confirm your credential. Please try again.",
  inclusion_proof_pending: "Your World ID is still being set up. Try again in a moment.",
  unexpected_response: "Unexpected response from World App. Please try again.",
  connection_failed: "Couldn't reach World App. Check your connection and try again.",
};

/** Turn a World ID error code / reason into human-readable text. Maps known codes,
 *  de-snake-cases unknown ones, and leaves already-human sentences intact. */
export function humanizeWorldIdError(input?: string): string {
  const raw = (input ?? "").trim();
  if (!raw) return "Verification failed. Please try again.";
  const key = raw.toLowerCase();
  if (MESSAGES[key]) return MESSAGES[key];
  // Already a human sentence (contains a space): keep wording, ensure a capital start.
  if (/\s/.test(raw)) return raw.charAt(0).toUpperCase() + raw.slice(1);
  // Bare snake_case / kebab code: de-snake and capitalize into a sentence.
  const words = key.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1) + ".";
}
