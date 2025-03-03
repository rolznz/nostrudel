import { CloseIcon } from "@chakra-ui/icons";
import { Box, IconButton, Text } from "@chakra-ui/react";
import { getUserDisplayName } from "../../../helpers/user-metadata";
import { useUserMetadata } from "../../../hooks/use-user-metadata";
import accountService, { Account } from "../../../services/account";
import { UserAvatar } from "../../../components/user-avatar";
import AccountInfoBadge from "../../../components/account-info-badge";

export default function AccountCard({ account }: { account: Account }) {
  const pubkey = account.pubkey;
  // this wont load unless the data is cached since there are no relay connections yet
  const metadata = useUserMetadata(pubkey, []);

  return (
    <Box
      display="flex"
      gap="4"
      alignItems="center"
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      padding="2"
      cursor="pointer"
      onClick={() => accountService.switchAccount(pubkey)}
    >
      <UserAvatar pubkey={pubkey} size="md" noProxy />
      <Box flex={1}>
        <Text isTruncated fontWeight="bold">
          {getUserDisplayName(metadata, pubkey)}
        </Text>
        <AccountInfoBadge account={account} />
      </Box>
      <IconButton
        icon={<CloseIcon />}
        aria-label="Remove Account"
        onClick={(e) => {
          e.stopPropagation();
          accountService.removeAccount(pubkey);
        }}
        size="md"
        variant="ghost"
      />
    </Box>
  );
}
