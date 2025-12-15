export type { CustomDataLink, Cid } from '@circles-profile/core';
export {
  fetchIpfsJson,
  ensureProfileShape,
  ensureNamespaceChunkShape,
  ensureNameIndexDocShape,
  loadProfileOrInit,
  loadIndex,
  insertIntoHead,
  saveHeadAndIndex,
  rebaseAndSaveProfile,
} from '@circles-profile/core';
