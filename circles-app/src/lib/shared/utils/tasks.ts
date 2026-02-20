import { writable } from 'svelte/store';

export type Task<T> = {
  name: string;
  promise: Promise<T>;
};

export const tasks = writable<Task<any>[]>([]);

async function showErrorPopup(err: Error): Promise<void> {
  const errorMessage = err.message;
  const stackTrace = err.stack;

  const [{ popupControls }, { default: ErrorPage }] = await Promise.all([
    import('$lib/shared/state/popup'),
    import('$lib/shared/ui/feedback/Error.svelte'),
  ]);

  popupControls.open({
    title: 'Error',
    component: ErrorPage,
    props: { errorMessage, stackTrace },
  });
}

export async function runTask<T>(task: Task<T>): Promise<T> {
  tasks.update((current) => [...current, task]);

  try {
    return await task.promise;
  } catch (e) {
    console.error(`Task errored: ${task.name}`, e);

    if (e instanceof Error) {
      try {
        await showErrorPopup(e);
      } catch (popupErr) {
        console.error('Failed to open error popup:', popupErr);
      }
    }

    throw e;
  } finally {
    tasks.update((current) => current.filter((t) => t !== task));
  }
}
