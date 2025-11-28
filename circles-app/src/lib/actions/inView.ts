export function inView(node: Element, options: IntersectionObserverInit = {}) {
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) node.dispatchEvent(new CustomEvent('enter'));
    },
    { rootMargin: '400px 0px', threshold: 0, ...options }
  );
  observer.observe(node);
  return {
    destroy() {
      observer.disconnect();
    },
  };
}
