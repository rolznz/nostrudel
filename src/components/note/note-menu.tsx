import {
  Button,
  Input,
  MenuItem,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useCopyToClipboard } from "react-use";

import { Bech32Prefix, getSharableNoteId, normalizeToBech32 } from "../../helpers/nip19";
import { NostrEvent } from "../../types/nostr-event";
import { MenuIconButton, MenuIconButtonProps } from "../menu-icon-button";

import { ClipboardIcon, CodeIcon, ExternalLinkIcon, LikeIcon, RelayIcon, RepostIcon, TrashIcon } from "../icons";
import NoteReactionsModal from "./note-zaps-modal";
import NoteDebugModal from "../debug-modals/note-debug-modal";
import { useCurrentAccount } from "../../hooks/use-current-account";
import { useCallback, useState } from "react";
import QuoteNote from "./quote-note";
import { buildDeleteEvent } from "../../helpers/nostr/event";
import signingService from "../../services/signing";
import clientRelaysService from "../../services/client-relays";
import { handleEventFromRelay } from "../../services/event-relays";
import relayPoolService from "../../services/relay-pool";
import NostrPublishAction from "../../classes/nostr-publish-action";

export const NoteMenu = ({ event, ...props }: { event: NostrEvent } & Omit<MenuIconButtonProps, "children">) => {
  const account = useCurrentAccount();
  const toast = useToast();
  const infoModal = useDisclosure();
  const reactionsModal = useDisclosure();
  const deleteModal = useDisclosure();
  const [reason, setReason] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [_clipboardState, copyToClipboard] = useCopyToClipboard();
  const noteId = normalizeToBech32(event.id, Bech32Prefix.Note);

  const deleteNote = useCallback(async () => {
    try {
      if (!account) throw new Error("not logged in");
      setDeleting(true);
      const deleteEvent = buildDeleteEvent([event.id], reason);
      const signed = await signingService.requestSignature(deleteEvent, account);
      const pub = new NostrPublishAction("Delete", clientRelaysService.getWriteUrls(), signed);
      await pub.onComplete;
      deleteModal.onClose();
    } catch (e) {
      if (e instanceof Error) toast({ description: e.message, status: "error" });
    } finally {
      setDeleting(false);
    }
  }, [event]);

  const broadcast = useCallback(() => {
    const missingRelays = clientRelaysService.getWriteUrls();

    const pub = new NostrPublishAction("Broadcast", missingRelays, event, 5000);

    pub.onResult.subscribe((result) => {
      if (result.status) {
        handleEventFromRelay(result.relay, event);
      }
    });
  }, []);

  return (
    <>
      <MenuIconButton {...props}>
        <MenuItem onClick={reactionsModal.onOpen} icon={<LikeIcon />}>
          Zaps/Reactions
        </MenuItem>
        <MenuItem
          onClick={() => window.open(`https://nostrapp.link/#${getSharableNoteId(event.id)}?select=true`, "_blank")}
          icon={<ExternalLinkIcon />}
        >
          View in app...
        </MenuItem>
        <MenuItem onClick={() => copyToClipboard("nostr:" + getSharableNoteId(event.id))} icon={<RepostIcon />}>
          Copy Share Link
        </MenuItem>
        {noteId && (
          <MenuItem onClick={() => copyToClipboard(noteId)} icon={<ClipboardIcon />}>
            Copy Note ID
          </MenuItem>
        )}
        {account?.pubkey === event.pubkey && (
          <MenuItem icon={<TrashIcon />} color="red.500" onClick={deleteModal.onOpen}>
            Delete Note
          </MenuItem>
        )}
        <MenuItem onClick={broadcast} icon={<RelayIcon />}>
          Broadcast
        </MenuItem>
        <MenuItem onClick={infoModal.onOpen} icon={<CodeIcon />}>
          View Raw
        </MenuItem>
      </MenuIconButton>

      {infoModal.isOpen && (
        <NoteDebugModal event={event} isOpen={infoModal.isOpen} onClose={infoModal.onClose} size="6xl" />
      )}

      {reactionsModal.isOpen && (
        <NoteReactionsModal noteId={event.id} isOpen={reactionsModal.isOpen} onClose={reactionsModal.onClose} />
      )}

      {deleteModal.isOpen && (
        <Modal isOpen={deleteModal.isOpen} onClose={deleteModal.onClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader px="4" py="2">
              Delete Note?
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody px="4" py="0">
              <QuoteNote noteId={event.id} />
              <Input
                name="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (optional)"
                mt="2"
              />
            </ModalBody>

            <ModalFooter px="4" py="4">
              <Button variant="ghost" size="sm" mr={2} onClick={deleteModal.onClose}>
                Cancel
              </Button>
              <Button colorScheme="red" variant="solid" onClick={deleteNote} size="sm" isLoading={deleting}>
                Delete
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </>
  );
};
