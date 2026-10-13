import type { PlatformAuthPayload } from "@core/shared";

/** An account confirmed by a provider. */
export interface VerifiedAccount {
  /** Provider-scoped account id (e.g. the GamePush player id). */
  id: string;
  /** Account display name, if the provider has one. */
  name?: string;
}

/** Verifies identity proofs sent by clients (see PlatformAuthPayload). */
export interface AccountProvider {
  /** Matches PlatformAuthPayload.provider, e.g. "gamepush". */
  readonly id: string;
  /** Resolves the verified account, or throws if the proof is invalid. */
  verify(payload: PlatformAuthPayload): Promise<VerifiedAccount>;
}

const providers = new Map<string, AccountProvider>();

/** Registers a provider for every room in this process. */
export function registerAccountProvider(provider: AccountProvider) {
  providers.set(provider.id, provider);
}

export function unregisterAccountProvider(id: string) {
  providers.delete(id);
}

export function getAccountProvider(id: string): AccountProvider | undefined {
  return providers.get(id);
}
