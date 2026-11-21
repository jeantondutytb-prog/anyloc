/** The parts of `window` the guard uses, so tests can fake them. */
export type PopupBackHost = {
  history: { state: unknown; pushState(state: unknown, unused: string): void; back(): void };
  location: { href: string };
  addEventListener(type: "popstate", listener: (event: Event) => void, capture: boolean): void;
};

type Guard = { onBack: () => void; onTop: boolean };

type Dispatcher = { guards: Guard[]; swallowNext: number };

const dispatchers = new WeakMap<PopupBackHost, Dispatcher>();

/**
 * Listens to `popstate` once per page, before anyone else: call it when the
 * module loads, so it is registered ahead of the page's own back handling
 * (useBackInterception, Next's router). Chrome runs a window's listeners in
 * the order they were added, so stopping the event only works from the first.
 */
export function installPopupBackListener(host: PopupBackHost): void {
  if (dispatchers.has(host)) return;
  const dispatcher: Dispatcher = { guards: [], swallowNext: 0 };
  dispatchers.set(host, dispatcher);
  host.addEventListener(
    "popstate",
    (event) => {
      if (dispatcher.swallowNext > 0) {
        // The popup removing its own entry: not a back press.
        dispatcher.swallowNext -= 1;
        event.stopImmediatePropagation();
        return;
      }
      const guard = dispatcher.guards.at(-1);
      if (!guard?.onTop) return;
      event.stopImmediatePropagation();
      guard.onTop = false;
      guard.onBack();
      // Pushed again in case the popup stays open (a question shown first);
      // the cleanup removes it if the popup closes.
      host.history.pushState(host.history.state, "");
      guard.onTop = true;
    },
    true
  );
}

/**
 * While a popup is open, the browser's back (Android's back button or gesture)
 * closes it like its X instead of leaving the page.
 *
 * One history entry is pushed when the popup opens; a back press pops it and
 * calls `onBack`. Closing the popup another way removes the entry without
 * anyone seeing it as a back press. The push waits for `defer`, so React's
 * dev double mount (mount, cleanup, mount) never pushes and pops in a row.
 * Returns the cleanup to run when the popup closes.
 */
export function guardPopupBack(
  host: PopupBackHost,
  onBack: () => void,
  defer: (run: () => void) => void = queueMicrotask
): () => void {
  installPopupBackListener(host);
  const dispatcher = dispatchers.get(host)!;
  const guard: Guard = { onBack, onTop: false };
  let openedAt: string | null = null;
  let disposed = false;

  defer(() => {
    if (disposed) return;
    openedAt = host.location.href;
    host.history.pushState(host.history.state, "");
    guard.onTop = true;
    dispatcher.guards.push(guard);
  });

  return () => {
    disposed = true;
    const at = dispatcher.guards.indexOf(guard);
    if (at >= 0) dispatcher.guards.splice(at, 1);
    // Left the page meanwhile: going back would undo that navigation.
    if (!guard.onTop || host.location.href !== openedAt) return;
    guard.onTop = false;
    dispatcher.swallowNext += 1;
    host.history.back();
  };
}
