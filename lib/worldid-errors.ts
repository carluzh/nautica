// World ID errors arrive as snake_case codes from both the IDKit widget (onError) and the
// verify API's `reason`. Map known codes to copy; de-snake-case unknown ones so an underscore
// never reaches a toast.

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

export function humanizeWorldIdError(input?: string): string {
  const raw = (input ?? "").trim();
  if (!raw) return "Verification failed. Please try again.";
  const key = raw.toLowerCase();
  if (MESSAGES[key]) return MESSAGES[key];
  // Already a human sentence (has a space): keep wording, just capitalize.
  if (/\s/.test(raw)) return raw.charAt(0).toUpperCase() + raw.slice(1);
  const words = key.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1) + ".";
}
