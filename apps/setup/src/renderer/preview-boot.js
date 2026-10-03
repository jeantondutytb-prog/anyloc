/** Dev preview: seed localStorage so init() opens the onboarding guide. */
(function () {
  const demoSession = {
    access_token: "preview-token",
    user: { id: "preview-user", email: "demo@anyloc.io" },
  };

  try {
    localStorage.setItem("anyloc.session", JSON.stringify(demoSession));
    if (location.hash === "#app") {
      // --preview-app: skip onboarding and land on the main screen.
      localStorage.setItem("anyloc.guideComplete", "true");
      localStorage.setItem("anyloc.iphoneInstalled", "1");
    } else {
      localStorage.removeItem("anyloc.guideComplete");
      localStorage.removeItem("anyloc.iphoneInstalled");
    }
  } catch {}

  const origFetch = window.fetch.bind(window);
  window.fetch = function (url, opts) {
    if (String(url).includes("location_settings") && opts?.method === "POST") {
      // Like auto-sync: "sending" first, then the iPhone confirms. Set
      // localStorage "anyloc.previewApply" to "error" or "silent" to see the
      // other outcomes.
      const row = JSON.parse(opts.body);
      const location = { ...row };
      let outcome = "applied";
      try { outcome = localStorage.getItem("anyloc.previewApply") || "applied"; } catch {}
      if (row.is_active && outcome !== "silent") {
        const emit = (status) => window.anylocSetup.previewAutoSync?.({ active: true, location, ...status });
        setTimeout(() => emit({ message: `GPS: ${row.name}`, error: false }), 600);
        setTimeout(() => emit(outcome === "error"
          ? { message: "L'iPhone est verrouillé. Déverrouille-le et réessaie.", error: true }
          : { message: `GPS: ${row.name}`, error: false, applied: true }), 2200);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([row]) });
    }
    if (String(url).includes("location_settings")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ name: "Marbella", lat: 36.5099, lng: -4.8862 }]),
      });
    }
    return origFetch(url, opts);
  };
})();
