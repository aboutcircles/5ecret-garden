import { describe, it, expect, vi } from 'vitest';
import { openStep, replaceStep, useAsyncAction } from '../src/lib/shared/flow/runtime.svelte';
import { popupControls } from '$lib/shared/state/popup';

describe('flow runtime helpers', () => {
  it('openStep delegates to popupControls.open with default props object', () => {
    const spy = vi.spyOn(popupControls, 'open').mockImplementation(() => {});

    const component = {} as any;
    openStep({
      title: 'Test Step',
      component,
      props: { a: 1 },
      key: 'k1',
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({
      kind: 'flow',
      dismiss: 'explicit',
      props: { a: 1 },
      title: 'Test Step',
      component,
      key: 'k1',
    });
  });

  it('replaceStep delegates to popupControls.replace with default props object when omitted', () => {
    const spy = vi.spyOn(popupControls, 'replace').mockImplementation(() => {});

    const component = {} as any;
    replaceStep({
      title: 'Replace Step',
      component,
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({
      kind: 'flow',
      dismiss: 'explicit',
      props: {},
      title: 'Replace Step',
      component,
    });
  });

  describe('useAsyncAction', () => {
    it('should track loading state', async () => {
      let resolveAction: (value: string) => void = () => {};
      const promise = new Promise<string>((resolve) => {
        resolveAction = resolve;
      });

      const action = useAsyncAction(async () => {
        return await promise;
      });

      expect(action.loading).toBe(false);

      const runPromise = action.run();
      expect(action.loading).toBe(true);

      resolveAction('success');
      await runPromise;

      expect(action.loading).toBe(false);
    });

    it('should track error state', async () => {
      const action = useAsyncAction(async () => {
        throw new Error('test error');
      });

      expect(action.error).toBe(null);

      await action.run();

      expect(action.error).toBe('test error');
      expect(action.loading).toBe(false);
    });

    it('should call onSuccess hook', async () => {
      const onSuccess = vi.fn();
      const action = useAsyncAction(async () => 'result', { onSuccess });

      await action.run();

      expect(onSuccess).toHaveBeenCalledWith('result');
    });

    it('should call onError hook', async () => {
      const onError = vi.fn();
      const action = useAsyncAction(async () => {
        throw new Error('test error');
      }, { onError });

      await action.run();

      expect(onError).toHaveBeenCalledWith('test error');
    });

    it('should reset state', async () => {
      const action = useAsyncAction(async () => {
        throw new Error('error');
      });

      await action.run();
      expect(action.error).toBe('error');

      action.reset();
      expect(action.error).toBe(null);
      expect(action.loading).toBe(false);
    });

    it('should handle non-Error objects thrown', async () => {
      const action = useAsyncAction(async () => {
        throw 'string error';
      });

      await action.run();
      expect(action.error).toBe('string error');

      const action2 = useAsyncAction(async () => {
        throw { some: 'object' };
      });

      await action2.run();
      expect(action2.error).toBe('Unknown error');
    });
  });
});
