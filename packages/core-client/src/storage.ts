/**
 * Small localStorage wrapper. Storage can be unavailable (private mode, iframes
 * with blocked third-party storage on some portals), so every access is guarded
 * and the game keeps working without persistence.
 */
export class Storage {
  constructor(private readonly prefix: string) {}

  get(key: string): string | null {
    try {
      return localStorage.getItem(this.prefix + key);
    } catch {
      return null;
    }
  }

  set(key: string, value: string) {
    try {
      localStorage.setItem(this.prefix + key, value);
    } catch {
      // Ignore: persistence is a convenience.
    }
  }
}
