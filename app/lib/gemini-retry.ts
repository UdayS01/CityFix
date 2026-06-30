export async function callGeminiWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  const delays = [1000, 3000, 6000, 10000];
  const maxAttempts = 5;
  let attempt = 1;

  while (attempt <= maxAttempts) {
    try {
      return await fn();
    } catch (error: any) {
      // Extract status if available.
      // Depending on the exact error shape from @google/generative-ai or fetch, 
      // the status could be on error.status, error.response?.status, or within the message.
      const status = error.status || error.response?.status;
      
      // Determine if error is a 4xx
      const is4xx = status && status >= 400 && status < 500;
      
      // If it's a 4xx error (e.g. 400 Bad Request, 403 Auth, 429 Quota Exhausted), 
      // the user explicitly asked NOT to retry.
      // Otherwise (5xx, network error, parsing error), treat it as transient and retry.
      const isTransient = !is4xx;

      if (!isTransient || attempt === maxAttempts) {
        throw error;
      }

      const delayMs = delays[attempt - 1] || 10000;
      console.warn(`Gemini API transient error (attempt ${attempt}/${maxAttempts}). Retrying in ${delayMs}ms...`, error.message);
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
      attempt++;
    }
  }
  throw new Error("Unreachable");
}
