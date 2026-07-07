import { writable } from 'svelte/store';
import { isUserRejection } from '$lib/shared/utils/errorHandler';
import { getErrorMessage } from '$lib/shared/utils/sdkAdapters';

export type Task<T> = {
  name: string;
  promise: Promise<T>;
};

export const tasks = writable<Task<any>[]>([]);

export type CompletedTask = { id: number; name: string; txHash?: string };

export const completedTasks = writable<CompletedTask[]>([]);

const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

function extractTxHash(result: unknown): string | undefined {
  if (!result || typeof result !== 'object') return undefined;
  const r = result as Record<string, unknown>;
  const candidate = r.hash ?? r.transactionHash;
  return typeof candidate === 'string' && TX_HASH_RE.test(candidate) ? candidate : undefined;
}

const SUCCESS_TOAST_MS = 5000;
let completedSeq = 0;

const dismissTimers = new Map<number, ReturnType<typeof setTimeout>>();

export function dismissCompletedTask(id: number): void {
  const timer = dismissTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    dismissTimers.delete(id);
  }
  completedTasks.update((current) => current.filter((t) => t.id !== id));
}

function pushCompleted(name: string, result: unknown): void {
  const id = ++completedSeq;
  const txHash = extractTxHash(result);
  completedTasks.update((current) => [...current, { id, name, txHash }]);
  const timer = setTimeout(() => {
    dismissTimers.delete(id);
    completedTasks.update((current) => current.filter((t) => t.id !== id));
  }, SUCCESS_TOAST_MS);
  dismissTimers.set(id, timer);
}

async function showErrorPopup(err: Error): Promise<void> {
  // Expected, handled failures (e.g. admin API 401/403/404) are surfaced inline by
  // their callers and never reach this popup. What reaches here is an *unexpected*
  // error, which we can't give a bespoke message — so show its message plus the
  // full, uncut stack trace (collapsed under "Stack Trace") to keep it debuggable.
  const errorMessage = getErrorMessage(err);
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
    pushCompleted(task.name, result);
    return result;
  } catch (e) {
    // A wallet/user rejection is an intentional cancellation, not a failure —
    // never open the error dialog for it (this was throwing users to a blank
    // "Error" screen after rejecting a signature). Re-throw so callers can react.
    if (isUserRejection(e)) {
      console.info(`Task cancelled by user: ${task.name}`);
      throw e;
    }

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
