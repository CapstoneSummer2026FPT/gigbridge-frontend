/**
 * Extracts and formats error messages from both thrown Error objects
 * and raw API response objects, flattening validation errors if present.
 */
export function getErrorMessage(err: any): string {
  if (!err) return 'An error occurred';

  // Extract from errors dictionary if present (both for ApiResponse and thrown Error/AxiosError)
  const errors = err.errors || err.response?.data?.errors;
  if (errors && typeof errors === 'object') {
    const messages: string[] = [];
    Object.entries(errors).forEach(([_, fieldErrors]) => {
      if (Array.isArray(fieldErrors)) {
        messages.push(...fieldErrors);
      } else if (typeof fieldErrors === 'string') {
        messages.push(fieldErrors);
      }
    });
    if (messages.length > 0) {
      return messages.join('\n');
    }
  }

  // Fallback to message properties
  return err.message || err.Message || (typeof err === 'string' ? err : 'An error occurred');
}
