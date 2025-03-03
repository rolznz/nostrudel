import { Box, Button, LinkBox, LinkOverlay } from "@chakra-ui/react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { UserAvatar } from "../user-avatar";
import { useCurrentAccount } from "../../hooks/use-current-account";
import { UserDnsIdentityIcon } from "../user-dns-identity-icon";
import { useUserMetadata } from "../../hooks/use-user-metadata";
import { nip19 } from "nostr-tools";
import { getUserDisplayName } from "../../helpers/user-metadata";

function ProfileButton() {
  const account = useCurrentAccount()!;
  const metadata = useUserMetadata(account.pubkey);

  return (
    <LinkBox borderRadius="lg" borderWidth={1} p="2" display="flex" gap="2" alignItems="center">
      <UserAvatar pubkey={account.pubkey} noProxy size="sm" />
      <Box>
        <LinkOverlay
          as={RouterLink}
          to={`/u/${nip19.npubEncode(account.pubkey)}`}
          whiteSpace="nowrap"
          fontWeight="bold"
          fontSize="lg"
        >
          {getUserDisplayName(metadata, account.pubkey)}
        </LinkOverlay>
      </Box>
    </LinkBox>
  );
}

export default function ProfileLink() {
  const account = useCurrentAccount();
  const location = useLocation();

  if (account) return <ProfileButton />;
  else
    return (
      <Button as={RouterLink} to="/login" state={{ from: location.pathname }} colorScheme="brand">
        Login
      </Button>
    );
}
