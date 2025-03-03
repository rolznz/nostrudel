import { useMemo, useRef } from "react";
import {
  Badge,
  Card,
  CardBody,
  CardFooter,
  CardProps,
  Divider,
  Flex,
  Heading,
  Image,
  LinkBox,
  LinkOverlay,
  Spacer,
  Text,
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import dayjs from "dayjs";
import { NostrEvent } from "../../../types/nostr-event";
import { parseStreamEvent } from "../../../helpers/nostr/stream";
import useEventNaddr from "../../../hooks/use-event-naddr";
import { useRegisterIntersectionEntity } from "../../../providers/intersection-observer";
import { UserAvatar } from "../../user-avatar";
import { UserLink } from "../../user-link";
import StreamStatusBadge from "../../../views/streams/components/status-badge";
import { EventRelays } from "../../note/note-relays";
import { useAsync } from "react-use";

export default function StreamNote({ event, ...props }: CardProps & { event: NostrEvent }) {
  const { value: stream, error } = useAsync(async () => parseStreamEvent(event), [event]);

  // if there is a parent intersection observer, register this card
  const ref = useRef<HTMLDivElement | null>(null);
  useRegisterIntersectionEntity(ref, event.id);

  const naddr = useEventNaddr(event);

  if (!stream || error) return null;

  return (
    <Card {...props} ref={ref}>
      <LinkBox as={CardBody} p="2" display="flex" flexDirection="column" gap="2">
        <Flex gap="2">
          <Flex gap="2" direction="column">
            <Flex gap="2" alignItems="center">
              <UserAvatar pubkey={stream.host} size="sm" noProxy />
              <Heading size="sm">
                <UserLink pubkey={stream.host} />
              </Heading>
            </Flex>
            {stream.image && <Image src={stream.image} alt={stream.title} borderRadius="lg" maxH="15rem" />}
            <Heading size="md">
              <LinkOverlay as={RouterLink} to={`/streams/${naddr}`}>
                {stream.title}
              </LinkOverlay>
            </Heading>
          </Flex>
        </Flex>
        {stream.tags.length > 0 && (
          <Flex gap="2" wrap="wrap">
            {stream.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </Flex>
        )}
        <Text>Updated: {dayjs.unix(stream.updated).fromNow()}</Text>
      </LinkBox>
      <Divider />
      <CardFooter p="2" display="flex" gap="2" alignItems="center">
        <StreamStatusBadge stream={stream} />
        <Spacer />
        <EventRelays event={stream.event} />
      </CardFooter>
    </Card>
  );
}
