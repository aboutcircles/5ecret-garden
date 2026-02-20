import { popupControls } from '$lib/shared/state/popup/popUp.svelte';
import PromptTextStep from '$lib/shared/ui/shell/PromptTextStep.svelte';

export type TextPromptOptions = {
  title?: string;
  label: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  validate?: (value: string) => string | null;
};

export function openTextPromptPopup(options: TextPromptOptions): Promise<string | null> {
  const {
    title = 'Enter value',
    label,
    initialValue = '',
    placeholder = '',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    validate,
  } = options;

  return new Promise<string | null>((resolve) => {
    let done = false;
    const finish = (value: string | null) => {
      if (done) return;
      done = true;
      resolve(value);
      popupControls.back();
    };

    popupControls.open({
      title,
      kind: 'edit',
      dismiss: 'explicit',
      component: PromptTextStep,
      props: {
        label,
        initialValue,
        placeholder,
        confirmLabel,
        cancelLabel,
        validate,
        onConfirm: (value: string) => finish(value),
        onCancel: () => finish(null),
      },
    });
  });
}
