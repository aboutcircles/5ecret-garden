import { popupControls } from '$lib/shared/state/popup';
import ConfirmActionStep from '$lib/shared/ui/shell/ConfirmActionStep.svelte';

type ConfirmOptions = {
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmClass?: string;
};

type InfoOptions = {
  message: string;
  title?: string;
  okLabel?: string;
  tone?: 'info' | 'success' | 'warning' | 'error';
};

export function openConfirmPopup(options: ConfirmOptions): Promise<boolean> {
  const {
    message,
    title = 'Please confirm',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    confirmClass = 'btn btn-primary w-full sm:w-auto sm:min-w-[120px]',
  } = options;

  return new Promise<boolean>((resolve) => {
    const resolveAndClose = (value: boolean) => {
      resolve(value);
      popupControls.back();
    };

    popupControls.open({
      title,
      kind: 'confirm',
      dismiss: 'explicit',
      component: ConfirmActionStep,
      props: {
        message,
        confirmLabel,
        cancelLabel,
        confirmClass,
        onConfirm: () => resolveAndClose(true),
        onCancel: () => resolveAndClose(false),
      },
    });
  });
}

export function openInfoPopup(options: InfoOptions): Promise<void> {
  const { message, title = 'Notice', okLabel = 'OK', tone = 'info' } = options;
  const baseBtn = 'btn w-full sm:w-auto sm:min-w-[120px]';
  const toneClass =
    tone === 'success'
      ? `${baseBtn} btn-success`
      : tone === 'warning'
        ? `${baseBtn} btn-warning`
        : tone === 'error'
          ? `${baseBtn} btn-error`
          : `${baseBtn} btn-primary`;

  return new Promise<void>((resolve) => {
    const close = () => {
      resolve();
      popupControls.back();
    };

    popupControls.open({
      title,
      kind: 'inspect',
      dismiss: 'explicit',
      component: ConfirmActionStep,
      props: {
        message,
        confirmLabel: okLabel,
        showCancel: false,
        confirmClass: toneClass,
        onConfirm: close,
      },
    });
  });
}
