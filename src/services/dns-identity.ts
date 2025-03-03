import dayjs from "dayjs";
import db from "./db";
import { fetchWithCorsFallback } from "../helpers/cors";

export function parseAddress(address: string): { name?: string; domain?: string } {
  const parts = address.trim().toLowerCase().split("@");
  return { name: parts[0], domain: parts[1] };
}

type IdentityJson = {
  names: Record<string, string | undefined>;
  relays?: Record<string, string[]>;
};
export type DnsIdentity = {
  name: string;
  domain: string;
  pubkey: string;
  relays: string[];
};

function getIdentityFromJson(name: string, domain: string, json: IdentityJson): DnsIdentity | undefined {
  const pubkey = json.names[name];
  if (!pubkey) return;

  const relays: string[] = json.relays?.[pubkey] ?? [];
  return { name, domain, pubkey, relays };
}

async function fetchAllIdentities(domain: string) {
  const json = await fetchWithCorsFallback(`//${domain}/.well-known/nostr.json`).then(
    (res) => res.json() as Promise<IdentityJson>,
  );

  await addToCache(domain, json);
}

async function fetchIdentity(address: string) {
  const { name, domain } = parseAddress(address);
  if (!name || !domain) throw new Error("invalid address");

  const json = await fetchWithCorsFallback(`https://${domain}/.well-known/nostr.json?name=${name}`)
    .then((res) => res.json() as Promise<IdentityJson>)
    .then((json) => {
      // convert all keys in names, and relays to lower case
      if (json.names) {
        for (const [name, pubkey] of Object.entries(json.names)) {
          delete json.names[name];
          json.names[name.toLowerCase()] = pubkey;
        }
      }
      if (json.relays) {
        for (const [name, pubkey] of Object.entries(json.relays)) {
          delete json.relays[name];
          json.relays[name.toLowerCase()] = pubkey;
        }
      }
      return json;
    });

  await addToCache(domain, json);

  return getIdentityFromJson(name, domain, json);
}

const inMemoryCache = new Map<string, DnsIdentity>();

async function addToCache(domain: string, json: IdentityJson) {
  const now = dayjs().unix();
  const transaction = db.transaction("dnsIdentifiers", "readwrite");

  for (const name of Object.keys(json.names)) {
    const identity = getIdentityFromJson(name, domain, json);
    if (identity) {
      const id = `${name}@${domain}`;

      // add to memory cache
      inMemoryCache.set(id, identity);

      // ad to db cache
      if (transaction.store.put) {
        await transaction.store.put({ ...identity, updated: now }, id);
      }
    }
  }
  await transaction.done;
}

async function getIdentity(address: string, alwaysFetch = false) {
  if (!inMemoryCache.has(address)) {
    const fromDb = await db.get("dnsIdentifiers", address);
    if (fromDb) inMemoryCache.set(address, fromDb);
  }

  const cached = inMemoryCache.get(address);
  if (cached && !alwaysFetch) return cached;

  return fetchIdentity(address);
}

async function pruneCache() {
  const keys = await db.getAllKeysFromIndex(
    "dnsIdentifiers",
    "updated",
    IDBKeyRange.upperBound(dayjs().subtract(1, "day").unix()),
  );

  for (const pubkey of keys) {
    db.delete("dnsIdentifiers", pubkey);
  }
}

const pending: Record<string, ReturnType<typeof getIdentity> | undefined> = {};
function dedupedGetIdentity(address: string, alwaysFetch = false) {
  if (pending[address]) return pending[address];
  return (pending[address] = getIdentity(address, alwaysFetch).then((v) => {
    delete pending[address];
    return v;
  }));
}

export const dnsIdentityService = {
  fetchAllIdentities,
  fetchIdentity,
  getIdentity: dedupedGetIdentity,
  pruneCache,
};

setTimeout(() => pruneCache(), 1000 * 60 * 20);

if (import.meta.env.DEV) {
  // @ts-ignore
  window.dnsIdentityService = dnsIdentityService;
}

export default dnsIdentityService;
