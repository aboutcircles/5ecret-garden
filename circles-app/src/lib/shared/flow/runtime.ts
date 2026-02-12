import { popupControls, type PopupContentDefinition } from '$lib/shared/state/popup';

export type OpenStepOptions = {
  title?: string;
  component: PopupContentDefinition['component'];
  props?: PopupContentDefinition['props'];
  key?: PopupContentDefinition['key'];
  onClose?: PopupContentDefinition['onClose'];
  hideTitle?: PopupContentDefinition['hideTitle'];
};

function toPopupDefinition(options: OpenStepOptions): PopupContentDefinition {
  return {
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
