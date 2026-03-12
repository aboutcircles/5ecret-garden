import type { Profile } from '@aboutcircles/sdk-types';

export type MigrateToV2Context = {
  inviter:
    | `0x${string}`
    | '0x0000000000000000000000000000000000000000'
    | undefined;
  profile: Profile | undefined;
  trustList: string[];
};
