import { popupControls, type PopupContentDefinition } from '$lib/shared/state/popup';

export type OpenStepOptions = {
  title?: string;
  component: PopupContentDefinition['component'];
  props?: PopupContentDefinition['props'];
  key?: PopupContentDefinition['key'];
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
