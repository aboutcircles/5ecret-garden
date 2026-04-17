import { popupControls, type PopupContentDefinition } from '$lib/shared/state/popup';

export type OpenStepOptions = {
  title?: string;
  component: PopupContentDefinition['component'];
  props?: PopupContentDefinition['props'];
  key?: PopupContentDefinition['key'];
  flowId?: PopupContentDefinition['flowId'];
  onClose?: PopupContentDefinition['onClose'];
  hideTitle?: PopupContentDefinition['hideTitle'];
  kind?: PopupContentDefinition['kind'];
  dismiss?: PopupContentDefinition['dismiss'];
  isDirty?: PopupContentDefinition['isDirty'];
  confirmDiscardMessage?: PopupContentDefinition['confirmDiscardMessage'];
};

function toPopupDefinition(options: OpenStepOptions): PopupContentDefinition {
  return {
    kind: 'flow',
    dismiss: 'explicit',
    props: {},
    ...options,
  };
}

export function openStep(options: OpenStepOptions): void {
  popupControls.open(toPopupDefinition(options));
}

export function replaceStep(options: OpenStepOptions): void {
  popupControls.replace(toPopupDefinition(options));
}

/**
 * Attempts to pop the navigation stack to a step with the given component.
 * If the component is not in the stack, it opens it as a new step.
 *
 * @param component The Svelte component to pop to or open.
 * @param options Configuration for the step (title, props, etc.), used if the step needs to be opened.
 */
export function popToOrOpen(component: OpenStepOptions['component'], options: Omit<OpenStepOptions, 'component'>): void {
  const didPop = popupControls.popTo((entry) => entry.component === component);
  if (!didPop) {
    openStep({
      component,
      ...options,
    });
  }
}

/**
 * A helper to run an async action and track its loading and error state.
 *
 * @param action The async function to execute.
 * @param options Hooks for success and error.
 * @returns An object with the current state and the `run` and `reset` functions.
 */
export function useAsyncAction<TArgs extends any[], TReturn>(
  action: (...args: TArgs) => Promise<TReturn>,
  options?: {
    onSuccess?: (result: TReturn) => void | Promise<void>;
    onError?: (error: string) => void | Promise<void>;
  }
) {
  let loading = $state(false);
  let error = $state<string | null>(null);

  async function run(...args: TArgs): Promise<TReturn | undefined> {
    loading = true;
    error = null;
    try {
      const result = await action(...args);
      if (options?.onSuccess) {
        await options.onSuccess(result);
      }
      return result;
    } catch (e: unknown) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : typeof e === 'string'
            ? e
            : 'Unknown error';

      error = errorMessage;
      if (options?.onError) {
        await options.onError(errorMessage);
      }
    } finally {
      loading = false;
    }
    return undefined;
  }

  function reset() {
    loading = false;
    error = null;
  }

  return {
    get loading() { return loading; },
    get error() { return error; },
    run,
    reset
  };
}
