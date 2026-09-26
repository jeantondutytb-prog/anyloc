/** Dev preview: seed localStorage so init() opens the onboarding guide. */
(function () {
  const demoSession = {
    access_token: "preview-token",
    user: { id: "preview-user", email: "demo@anyloc.io" },
  };

  try {
    localStorage.setItem("anyloc.session", JSON.stringify(demoSession));
    localStorage.removeItem("anyloc.guideComplete");
    localStorage.removeItem("anyloc.iphoneInstalled");
  } catch {}

  const origFetch = window.fetch.bind(window);
  window.fetch = function (url, opts) {
    if (String(url).includes("location_settings")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ name: "Marbella", lat: 36.5099, lng: -4.8862 }]),
      });
    }
    return origFetch(url, opts);
  };
})();
