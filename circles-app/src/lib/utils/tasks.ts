import { get, writable } from 'svelte/store';
import ErrorPage from '$lib/pages/Error.svelte';
import { popupControls } from '$lib/stores/popUp';

export type Task<T> = {
  name: string;
  promise: Promise<T>;
};

export const tasks = writable<Task<any>[]>([]);

export async function runTask<T>(task: Task<T>): Promise<T> {
  tasks.update((current) => [...current, task]);

  try {
    return await task.promise;
  } catch (e) {
    console.error(`Task errored: ${task.name}`, e);
    if (e instanceof Error) {
      console.error(`Task errored: ${task.name}`, e);
      popupControls.open({
        title: 'Error',
        component: ErrorPage,
        props: {
          errorMessage: e.message,
          stackTrace: e.stack,
        },
      });
    } else {
      console.error(`Task errored with unknown error: ${task.name}`, e);
    }
    throw e;
  } finally {
    tasks.update((current) => current.filter((t) => t !== task));
  }
}
