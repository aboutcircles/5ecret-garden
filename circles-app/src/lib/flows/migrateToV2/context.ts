import type {Profile} from "@circles-sdk/profiles";

export type MigrateToV2Context = {
    profile: Profile | undefined;
    trustList: string[]
};