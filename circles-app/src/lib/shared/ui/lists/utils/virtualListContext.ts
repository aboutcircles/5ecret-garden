export const VIRTUAL_LIST_CONTEXT_KEY = 'circles:virtual-list-context';

export interface VirtualListController {
  focusIndex: (index: number) => void;
  rowCount: () => number;
}
