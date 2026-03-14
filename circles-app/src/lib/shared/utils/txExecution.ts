import { runTask } from '$lib/shared/utils/tasks';

export type TxExecutionPattern = 'submit-first' | 'confirm-first';

type SubmitFirstOptions<T> = {
  name: string;
  submit: () => Promise<T>;
  onSubmitted?: () => void | Promise<void>;
  onError?: (error: unknown) => void | Promise<void>;
};

type ConfirmFirstOptions<T> = {
  name: string;
  submit: () => Promise<T>;
  onSuccess?: (result: T) => void | Promise<void>;
};

/**
 * Submit-first semantics: start tracking immediately, do not block caller.
 * Use for flows where UI can continue once transaction submission is initiated.
 */
export function executeTxSubmitFirst<T>(options: SubmitFirstOptions<T>): Promise<T> {
  const started = Promise.resolve().then(options.submit);
  const tracked = runTask({ name: options.name, promise: started });

  // Intentionally fire right after submission starts (do not await tx completion).
  // This preserves submit-first UX where UI can continue immediately.
  void Promise.resolve(options.onSubmitted?.());

  void tracked.catch(async (error) => {
    await options.onError?.(error);
  });

  return started;
}

/**
 * Confirm-first semantics: caller awaits completion and optional post-success hooks.
 * Use for flows where deterministic success (e.g., parsed receipt/event) is required.
 */
export async function executeTxConfirmFirst<T>(options: ConfirmFirstOptions<T>): Promise<T> {
  const result = await runTask({
    name: options.name,
    promise: Promise.resolve().then(options.submit),
  });

  await options.onSuccess?.(result);
  return result;
}
