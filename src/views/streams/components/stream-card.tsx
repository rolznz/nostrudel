import { useRef } from "react";
import { ParsedStream } from "../../../helpers/nostr/stream";
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
  Tag,
  Text,
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { UserAvatar } from "../../../components/user-avatar";
import { UserLink } from "../../../components/user-link";
import dayjs from "dayjs";
import StreamStatusBadge from "./status-badge";
import { EventRelays } from "../../../components/note/note-relays";
import { useRegisterIntersectionEntity } from "../../../providers/intersection-observer";
import useEventNaddr from "../../../hooks/use-event-naddr";
import StreamDebugButton from "./stream-debug-button";

export default function StreamCard({ stream, ...props }: CardProps & { stream: ParsedStream }) {
  const { title, image } = stream;

  // if there is a parent intersection observer, register this card
  const ref = useRef<HTMLDivElement | null>(null);
  useRegisterIntersectionEntity(ref, stream.event.id);

  const naddr = useEventNaddr(stream.event, stream.relays);

  return (
    <Card {...props} ref={ref}>
      <LinkBox as={CardBody} p="2" display="flex" flexDirection="column" gap="2">
        {image && <Image src={image} alt={title} borderRadius="lg" />}
        <Flex gap="2" alignItems="center">
          <UserAvatar pubkey={stream.host} size="sm" noProxy />
          <Heading size="sm">
            <UserLink pubkey={stream.host} />
          </Heading>
        </Flex>
        <Heading size="md">
          <LinkOverlay as={RouterLink} to={`/streams/${naddr}`}>
            {title}
          </LinkOverlay>
        </Heading>
        {stream.tags.length > 0 && (
          <Flex gap="2" wrap="wrap">
            {stream.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </Flex>
        )}
        {stream.starts && <Text>Started: {dayjs.unix(stream.starts).fromNow()}</Text>}
      </LinkBox>
      <Divider />
      <CardFooter p="2" display="flex" gap="2" alignItems="center">
        <StreamStatusBadge stream={stream} />
        <Spacer />
        <EventRelays event={stream.event} />
        <StreamDebugButton stream={stream} variant="ghost" size="sm" />
      </CardFooter>
    </Card>
  );
}
