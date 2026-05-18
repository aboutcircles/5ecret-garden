import { writable } from 'svelte/store';

export type Task<T> = {
  name: string;
  promise: Promise<T>;
};

export const tasks = writable<Task<any>[]>([]);

export type CompletedTask = { id: number; name: string };

export const completedTasks = writable<CompletedTask[]>([]);

const SUCCESS_TOAST_MS = 3500;
let completedSeq = 0;

function pushCompleted(name: string): void {
  const id = ++completedSeq;
  completedTasks.update((current) => [...current, { id, name }]);
  setTimeout(() => {
    completedTasks.update((current) => current.filter((t) => t.id !== id));
  }, SUCCESS_TOAST_MS);
}

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
    const result = await task.promise;
    pushCompleted(task.name);
    return result;
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
