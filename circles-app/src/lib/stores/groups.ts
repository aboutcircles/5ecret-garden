import { avatar } from '$lib/stores/avatar';
import { type CirclesEventType, type GroupRow } from '@circles-sdk/data';
import { get } from 'svelte/store';
import { createCirclesQueryStore } from '$lib/stores/query/circlesQueryStore';
import { circles } from '$lib/stores/circles';

const groupEvents: Set<CirclesEventType> = new Set([]);

export const createGroups = () => {

  const _avatar = get(avatar);
  if (!_avatar) {
    throw new Error('Avatar instance not found');
  }

  const c = get(circles);
  if (!c) {
    throw new Error('Circles instance not found');
  }

  return createCirclesQueryStore<GroupRow>(
    async () => c.data.findGroups(25),
    groupEvents
  );
};
