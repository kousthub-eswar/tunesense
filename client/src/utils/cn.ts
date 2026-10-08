/**
 * Utility to combine conditional class names safely without external dependencies.
 */
export function cn(...inputs: (string | boolean | undefined | null)[]): string {
  return inputs.filter(Boolean).join(' ');
}
