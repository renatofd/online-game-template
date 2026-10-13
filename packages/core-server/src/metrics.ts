/**
 * Minimal Prometheus-style metrics, served at GET /metrics.
 * Deliberately dependency-free; swap for prom-client if you need more.
 */

/** Tick duration buckets in milliseconds. A 30 Hz tick has a 33 ms budget. */
const TICK_BUCKETS_MS = [1, 2, 5, 10, 20, 33, 50, 100];

class Histogram {
  private counts = new Array<number>(TICK_BUCKETS_MS.length).fill(0);
  private sum = 0;
  private count = 0;

  observe(valueMs: number) {
    this.sum += valueMs;
    this.count++;
    TICK_BUCKETS_MS.forEach((le, i) => {
      if (valueMs <= le) this.counts[i] = (this.counts[i] ?? 0) + 1;
    });
  }

  render(name: string, labels: string): string[] {
    const lines = TICK_BUCKETS_MS.map((le, i) => `${name}_bucket{${labels},le="${le}"} ${this.counts[i]}`);
    lines.push(`${name}_bucket{${labels},le="+Inf"} ${this.count}`);
    lines.push(`${name}_sum{${labels}} ${this.sum.toFixed(3)}`);
    lines.push(`${name}_count{${labels}} ${this.count}`);
    return lines;
  }
}

const tickHistograms = new Map<string, Histogram>();
const counters = new Map<string, number>();

export const metrics = {
  /** Records how long one simulation tick of a room type took. */
  observeTick(roomName: string, durationMs: number) {
    let h = tickHistograms.get(roomName);
    if (!h) {
      h = new Histogram();
      tickHistograms.set(roomName, h);
    }
    h.observe(durationMs);
  },

  /** Increments a counter, e.g. metrics.inc("auth_failures_total"). */
  inc(name: string, by = 1) {
    counters.set(name, (counters.get(name) ?? 0) + by);
  },

  /** Renders the exposition text. `gauges` are point-in-time values computed by the caller. */
  render(gauges: Record<string, number>): string {
    const lines: string[] = [];
    for (const [name, value] of Object.entries(gauges)) {
      lines.push(`# TYPE ${name} gauge`, `${name} ${value}`);
    }
    for (const [name, value] of counters) {
      lines.push(`# TYPE game_${name} counter`, `game_${name} ${value}`);
    }
    if (tickHistograms.size > 0) lines.push("# TYPE game_tick_duration_ms histogram");
    for (const [room, h] of tickHistograms) lines.push(...h.render("game_tick_duration_ms", `room="${room}"`));
    return `${lines.join("\n")}\n`;
  },
};
