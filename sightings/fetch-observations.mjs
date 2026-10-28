const ATTEMPTS = 4;
const TIMEOUT_MS = 30_000;
const MAX_DELAY_MS = 30_000;

/** @param {string | null} value */
function retryAfterMs(value) {
  if (!value) return 0;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - Date.now();
  return Number.isFinite(delay) ? Math.max(0, Math.min(delay, MAX_DELAY_MS)) : 0;
}

/**
 * Retry only transient upstream failures. A permanently failed group still aborts
 * the puller before it writes the dataset, so CI never publishes a partial refresh.
 * The timeout covers reading/parsing the body as well as receiving the headers.
 * @param {string} url
 * @param {string} context Region/species, for actionable workflow errors.
 * @param {{ userAgent: string, fetch?: typeof fetch, sleep?: (ms: number) => Promise<void>, timeoutMs?: number }} options
 * @returns {Promise<any[]>}
 */
export async function fetchObservations(url, context, options) {
  const request = options.fetch ?? globalThis.fetch;
  const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    let retryable = false;
    let retryDelay = 0;
    try {
      // Network errors (including a body interrupted mid-stream) and timeouts
      // are retryable. HTTP and payload errors are classified below.
      retryable = true;
      const response = await request(url, {
        headers: { "User-Agent": options.userAgent },
        signal: AbortSignal.timeout(options.timeoutMs ?? TIMEOUT_MS),
      });
      if (!response.ok) {
        retryable = response.status === 408 || response.status === 429 || response.status >= 500;
        retryDelay = retryAfterMs(response.headers.get("retry-after"));
        await response.body?.cancel();
        throw new Error(`iNaturalist HTTP ${response.status} ${response.statusText}`);
      }
      let data;
      try {
        data = await response.json();
      } catch (error) {
        if (error instanceof SyntaxError) retryable = false;
        throw error;
      }
      retryable = false;
      if (!data || !Array.isArray(data.results)) {
        throw new Error("iNaturalist response is missing a results array");
      }
      return data.results;
    } catch (error) {
      if (!retryable || attempt === ATTEMPTS) {
        throw new Error(`iNaturalist ${context} failed after ${attempt} attempt(s)`, { cause: error });
      }
      const delay = Math.max(2000 * 2 ** (attempt - 1), retryDelay);
      console.warn(`iNaturalist ${context}: attempt ${attempt}/${ATTEMPTS} failed; retrying in ${delay}ms`);
      await sleep(delay);
    }
  }
  throw new Error(`iNaturalist ${context}: exhausted retries`);
}
