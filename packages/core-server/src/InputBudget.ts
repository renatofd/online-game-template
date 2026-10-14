/**
 * Limits how many buffered inputs each client may apply per server tick.
 *
 * A fair client sends one input per tick, so draining the whole buffer every
 * tick would let a modified client move several steps per tick (a speed hack)
 * just by sending inputs faster. Each tick grants one input of credit, up to
 * `maxBurst`, so inputs delayed by network jitter still catch up quickly while
 * the long-run rate stays at one per tick. Extra inputs wait in the buffer
 * (which drops the oldest when full).
 *
 *   const n = this.inputBudget.refill(sessionId);
 *   for (const input of channel.take(n)) stepPlayer(...);
 *   this.inputBudget.spend(sessionId, applied);
 */
export class InputBudget {
  private credit = new Map<string, number>();

  constructor(private readonly maxBurst = 4) {}

  /** Adds this tick's credit and returns how many inputs the client may apply now. Call once per tick. */
  refill(id: string): number {
    const credit = Math.min(this.maxBurst, (this.credit.get(id) ?? 0) + 1);
    this.credit.set(id, credit);
    return credit;
  }

  /** Records the inputs actually applied this tick. */
  spend(id: string, count: number) {
    this.credit.set(id, Math.max(0, (this.credit.get(id) ?? 0) - count));
  }

  /** Forget a client (call in onLeave). */
  delete(id: string) {
    this.credit.delete(id);
  }
}
