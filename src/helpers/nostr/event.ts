import dayjs from "dayjs";
import { getEventRelays } from "../../services/event-relays";
import { DraftNostrEvent, isETag, isPTag, NostrEvent, RTag, Tag } from "../../types/nostr-event";
import { RelayConfig, RelayMode } from "../../classes/relay";
import { Kind, nip19 } from "nostr-tools";
import { getMatchNostrLink } from "../regexp";
import relayScoreboardService from "../../services/relay-scoreboard";
import { getAddr } from "../../services/replaceable-event-requester";

export function isReply(event: NostrEvent | DraftNostrEvent) {
  return event.kind === 1 && !!getReferences(event).replyId;
}

export function isRepost(event: NostrEvent | DraftNostrEvent) {
  const match = event.content.match(getMatchNostrLink());
  return event.kind === 6 || (match && match[0].length === event.content.length);
}

export function truncatedId(str: string, keep = 6) {
  if (str.length < keep * 2 + 3) return str;
  return str.substring(0, keep) + "..." + str.substring(str.length - keep);
}

// used to get a unique Id for each event, should take into account replaceable events
export function getEventUID(event: NostrEvent) {
  if (event.kind >= 30000 && event.kind < 40000) {
    return getAddr(event.kind, event.pubkey, event.tags.find((t) => t[0] === "d" && t[1])?.[1]);
  }
  return event.id;
}

/**
 * returns an array of tag indexes that are referenced in the content
 * either with the legacy #[0] syntax or nostr:xxxxx links
 */
export function getContentTagRefs(content: string, tags: Tag[]) {
  const indexes = new Set();
  Array.from(content.matchAll(/#\[(\d+)\]/gi)).forEach((m) => indexes.add(parseInt(m[1])));

  const linkMatches = Array.from(content.matchAll(getMatchNostrLink()));
  for (const [_, _prefix, link] of linkMatches) {
    try {
      const decoded = nip19.decode(link);

      let type: string;
      let id: string;
      switch (decoded.type) {
        case "npub":
          id = decoded.data;
          type = "p";
          break;
        case "nprofile":
          id = decoded.data.pubkey;
          type = "p";
          break;
        case "note":
          id = decoded.data;
          type = "e";
          break;
        case "nevent":
          id = decoded.data.id;
          type = "e";
          break;
      }

      let t = tags.find((t) => t[0] === type && t[1] === id);
      if (t) {
        let index = tags.indexOf(t);
        indexes.add(index);
      }
    } catch (e) {}
  }

  return Array.from(indexes);
}

export function filterTagsByContentRefs(content: string, tags: Tag[], referenced = true) {
  const contentTagRefs = getContentTagRefs(content, tags);

  const newTags: Tag[] = [];
  for (let i = 0; i < tags.length; i++) {
    if (contentTagRefs.includes(i) === referenced) {
      newTags.push(tags[i]);
    }
  }
  return newTags;
}

export type EventReferences = ReturnType<typeof getReferences>;
export function getReferences(event: NostrEvent | DraftNostrEvent) {
  const eTags = event.tags.filter(isETag);
  const pTags = event.tags.filter(isPTag);

  const events = eTags.map((t) => t[1]);
  const contentTagRefs = getContentTagRefs(event.content, event.tags);

  let replyId = eTags.find((t) => t[3] === "reply")?.[1];
  let rootId = eTags.find((t) => t[3] === "root")?.[1];

  if (!rootId || !replyId) {
    // a direct reply dose not need a "reply" reference
    // https://github.com/nostr-protocol/nips/blob/master/10.md

    // this is not necessarily to spec. but if there is only one id (root or reply) then assign it to both
    // this handles the cases where a client only set a "reply" tag and no root
    rootId = replyId = rootId || replyId;
  }

  // legacy behavior
  // https://github.com/nostr-protocol/nips/blob/master/10.md#positional-e-tags-deprecated
  const legacyTags = eTags.filter((t, i) => {
    // ignore it if there is a third piece of data
    if (t[3]) return false;
    const tagIndex = event.tags.indexOf(t);
    if (contentTagRefs.includes(tagIndex)) return false;
    return true;
  });
  if (!rootId && !replyId && legacyTags.length >= 1) {
    // console.info(`Using legacy threading behavior for ${event.id}`, event);

    // first tag is the root
    rootId = legacyTags[0][1];
    // last tag is reply
    replyId = legacyTags[legacyTags.length - 1][1] ?? rootId;
  }

  return {
    events,
    rootId,
    replyId,
    contentTagRefs,
  };
}

export function buildRepost(event: NostrEvent): DraftNostrEvent {
  const relays = getEventRelays(event.id).value;
  const topRelay = relayScoreboardService.getRankedRelays(relays)[0] ?? "";

  const tags: NostrEvent["tags"] = [];
  tags.push(["e", event.id, topRelay]);

  return {
    kind: Kind.Repost,
    tags,
    content: "",
    created_at: dayjs().unix(),
  };
}

export function buildDeleteEvent(eventIds: string[], reason = ""): DraftNostrEvent {
  return {
    kind: Kind.EventDeletion,
    tags: eventIds.map((id) => ["e", id]),
    content: reason,
    created_at: dayjs().unix(),
  };
}

export function parseRTag(tag: RTag): RelayConfig {
  switch (tag[2]) {
    case "write":
      return { url: tag[1], mode: RelayMode.WRITE };
    case "read":
      return { url: tag[1], mode: RelayMode.READ };
    default:
      return { url: tag[1], mode: RelayMode.ALL };
  }
}

export function parseCoordinate(a: string) {
  const parts = a.split(":") as (string | undefined)[];
  const kind = parts[0] && parseInt(parts[0]);
  const pubkey = parts[1];
  const d = parts[2];

  if (!kind) return null;
  if (!pubkey) return null;

  return {
    kind,
    pubkey,
    d,
  };
}
