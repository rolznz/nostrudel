import { Flex, SimpleGrid } from "@chakra-ui/react";
import { useOutletContext } from "react-router-dom";
import { truncatedId } from "../../helpers/nostr/event";
import { useAdditionalRelayContext } from "../../providers/additional-relay-context";
import TimelineActionAndStatus from "../../components/timeline-page/timeline-action-and-status";
import IntersectionObserverProvider from "../../providers/intersection-observer";
import { useTimelineCurserIntersectionCallback } from "../../hooks/use-timeline-cursor-intersection-callback";
import useTimelineLoader from "../../hooks/use-timeline-loader";
import { STREAM_KIND } from "../../helpers/nostr/stream";
import useSubject from "../../hooks/use-subject";
import useParsedStreams from "../../hooks/use-parsed-streams";
import StreamCard from "../streams/components/stream-card";

export default function UserStreamsTab() {
  const { pubkey } = useOutletContext() as { pubkey: string };
  const readRelays = useAdditionalRelayContext();

  const timeline = useTimelineLoader(truncatedId(pubkey) + "-streams", readRelays, [
    {
      authors: [pubkey],
      kinds: [STREAM_KIND],
    },
    { "#p": [pubkey], kinds: [STREAM_KIND] },
  ]);

  const callback = useTimelineCurserIntersectionCallback(timeline);

  const events = useSubject(timeline.timeline);
  const streams = useParsedStreams(events);

  return (
    <Flex p="2" gap="2" overflow="hidden" direction="column">
      <IntersectionObserverProvider<string> callback={callback}>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3, xl: 4 }} spacing="2">
          {streams.map((stream) => (
            <StreamCard key={stream.event.id} stream={stream} />
          ))}
        </SimpleGrid>
        <TimelineActionAndStatus timeline={timeline} />
      </IntersectionObserverProvider>
    </Flex>
  );
}
