/**
 * TweetDwellObserver tracks when tweet elements enter the viewport and remain
 * visible for a minimum dwell duration (e.g., 350ms) before triggering a callback.
 */
export class TweetDwellObserver {
  constructor(options = {}) {
    this.dwellMs = options.dwellMs ?? 350;
    this.onDwell = options.onDwell || (() => {});
    this.timers = new Map();

    const ObserverClass = options.ObserverClass || (typeof IntersectionObserver !== "undefined" ? IntersectionObserver : null);

    if (ObserverClass) {
      this.observer = new ObserverClass(this.handleIntersection.bind(this), {
        root: options.root || null,
        rootMargin: options.rootMargin || "0px",
        threshold: options.threshold ?? 0.1
      });
    } else {
      this.observer = null;
    }
  }

  handleIntersection(entries) {
    for (const entry of entries) {
      const el = entry.target;

      if (entry.isIntersecting) {
        if (!this.timers.has(el)) {
          const timerId = setTimeout(() => {
            this.timers.delete(el);
            this.onDwell(el);
          }, this.dwellMs);
          this.timers.set(el, timerId);
        }
      } else {
        if (this.timers.has(el)) {
          clearTimeout(this.timers.get(el));
          this.timers.delete(el);
        }
      }
    }
  }

  observe(element) {
    if (!element || !this.observer) {
      return;
    }
    this.observer.observe(element);
  }

  unobserve(element) {
    if (!element) {
      return;
    }
    if (this.timers.has(element)) {
      clearTimeout(this.timers.get(element));
      this.timers.delete(element);
    }
    if (this.observer) {
      this.observer.unobserve(element);
    }
  }

  disconnect() {
    for (const timerId of this.timers.values()) {
      clearTimeout(timerId);
    }
    this.timers.clear();
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}
