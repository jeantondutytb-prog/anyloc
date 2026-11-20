import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { guardPopupBack, installPopupBackListener, type PopupBackHost } from "./popup-back";

/**
 * A browser history: entries, the current index, popstate listeners run in
 * the order they were added (what Chrome does on window), and back presses
 * delivered later like a browser.
 */
function fakeBrowser() {
  const entries: { href: string; state: unknown }[] = [
    { href: "https://anyloc.io/signup", state: "next-signup" },
    { href: "https://anyloc.io/checkout", state: "next-checkout" },
  ];
  let index = 1;
  const listeners: { listener: (event: Event) => void; capture: boolean }[] = [];
  const pending: (() => void)[] = [];
  // What the page itself (Next, useBackInterception) saw as back presses.
  const pageSaw: string[] = [];

  function dispatch() {
    let stopped = false;
    const event = { stopImmediatePropagation: () => (stopped = true) } as unknown as Event;
    for (const { listener } of [...listeners]) {
      if (stopped) break;
      listener(event);
    }
    if (!stopped) pageSaw.push(entries[index].href);
  }

  const host: PopupBackHost = {
    history: {
      get state() {
        return entries[index].state;
      },
      pushState(state) {
        entries.splice(index + 1, entries.length, { href: entries[index].href, state });
        index += 1;
      },
      back() {
        pending.push(() => {
          if (index === 0) return;
          index -= 1;
          dispatch();
        });
      },
    },
    location: {
      get href() {
        return entries[index].href;
      },
    },
    addEventListener(_type, listener, capture) {
      listeners.push({ listener, capture });
    },
  };

  return {
    host,
    /** The visitor presses back (Android button or gesture). */
    pressBack: () => host.history.back(),
    /** Lets the browser deliver what is queued. */
    flush: () => {
      while (pending.length) pending.shift()!();
    },
    /** A navigation to another page, like Next's router.push. */
    navigate: (href: string) => {
      entries.splice(index + 1, entries.length, { href, state: "next-other" });
      index += 1;
    },
    /** The page's own back handler, registered before the popup opened. */
    listenAsPage: () => host.addEventListener("popstate", () => {}, false),
    get href() {
      return entries[index].href;
    },
    get length() {
      return entries.length;
    },
    get index() {
      return index;
    },
    pageSaw,
  };
}

const now = (run: () => void) => run();

describe("guardPopupBack", () => {
  it("closes the popup on back instead of leaving the page", () => {
    const browser = fakeBrowser();
    installPopupBackListener(browser.host);
    browser.listenAsPage();
    let backs = 0;
    const cleanup = guardPopupBack(browser.host, () => (backs += 1), now);

    browser.pressBack();
    browser.flush();

    assert.equal(backs, 1);
    assert.equal(browser.href, "https://anyloc.io/checkout");
    assert.deepEqual(browser.pageSaw, []);

    // The popup closes after that back press: its entry goes away quietly.
    cleanup();
    browser.flush();
    assert.equal(browser.index, 1);
    assert.equal(browser.href, "https://anyloc.io/checkout");
    assert.deepEqual(browser.pageSaw, []);
  });

  it("stays armed while the popup stays open, for a second back press", () => {
    const browser = fakeBrowser();
    let backs = 0;
    const cleanup = guardPopupBack(browser.host, () => (backs += 1), now);

    // 1st press: the exit question shows, the popup stays open.
    browser.pressBack();
    browser.flush();
    // 2nd press: closes it for good.
    browser.pressBack();
    browser.flush();
    assert.equal(backs, 2);
    assert.equal(browser.href, "https://anyloc.io/checkout");

    cleanup();
    browser.flush();
    assert.equal(browser.index, 1);
    assert.deepEqual(browser.pageSaw, []);
  });

  it("removes its entry without a back press when closed with the X", () => {
    const browser = fakeBrowser();
    installPopupBackListener(browser.host);
    browser.listenAsPage();
    let backs = 0;
    const cleanup = guardPopupBack(browser.host, () => (backs += 1), now);
    assert.equal(browser.index, 2);

    cleanup();
    browser.flush();

    assert.equal(backs, 0);
    assert.equal(browser.index, 1);
    assert.deepEqual(browser.pageSaw, []);

    // The next back press is the page's again.
    browser.pressBack();
    browser.flush();
    assert.equal(browser.href, "https://anyloc.io/signup");
    assert.deepEqual(browser.pageSaw, ["https://anyloc.io/signup"]);
  });

  it("does not go back when the visitor went to another page meanwhile", () => {
    const browser = fakeBrowser();
    const cleanup = guardPopupBack(browser.host, () => {}, now);
    browser.navigate("https://anyloc.io/dashboard");
    const before = browser.index;

    cleanup();
    browser.flush();

    assert.equal(browser.index, before);
    assert.equal(browser.href, "https://anyloc.io/dashboard");
  });

  it("pushes nothing for React's dev double mount, then guards the real one", () => {
    const browser = fakeBrowser();
    installPopupBackListener(browser.host);
    browser.listenAsPage();
    const queued: (() => void)[] = [];
    const later = (run: () => void) => queued.push(run);
    let backs = 0;

    // Mount, cleanup, mount in the same task, like StrictMode.
    guardPopupBack(browser.host, () => (backs += 1), later)();
    const cleanup = guardPopupBack(browser.host, () => (backs += 1), later);
    queued.forEach((run) => run());
    assert.equal(browser.index, 2);

    browser.pressBack();
    browser.flush();
    assert.equal(backs, 1);
    assert.equal(browser.href, "https://anyloc.io/checkout");
    assert.deepEqual(browser.pageSaw, []);
    cleanup();
    browser.flush();
    assert.equal(browser.index, 1);
    assert.deepEqual(browser.pageSaw, []);
  });
});
