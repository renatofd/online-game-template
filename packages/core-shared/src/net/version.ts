import { CORE_PROTOCOL_VERSION, type ProtocolVersions } from "./protocol";

/** True when the versions a client sent match this build. Tolerates missing/garbage input. */
export function isCompatibleVersion(sent: unknown, gameVersion: number): boolean {
  if (typeof sent !== "object" || sent === null) return false;
  const v = sent as Partial<ProtocolVersions>;
  return v.core === CORE_PROTOCOL_VERSION && v.game === gameVersion;
}
