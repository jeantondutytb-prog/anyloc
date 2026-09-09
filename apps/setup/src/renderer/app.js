const STEPS = [
  {
    title: "Installe les outils USB sur ton Mac",
    description:
      "Terminal : pip3 install pymobiledevice3 — puis Revérifier dans Anyloc Setup.",
  },
  {
    title: "Branche ton iPhone en USB",
    description:
      "Accepte « Faire confiance à cet ordinateur » sur l'écran du téléphone.",
  },
  {
    title: "Active le mode développeur",
    description:
      "Visible seulement après la connexion USB. Réglages → Confidentialité et sécurité → tout en bas → Mode développeur.",
  },
  {
    title: "Lance l'installation",
    description:
      "Clique sur « Installer sur iPhone » une fois l'appareil détecté.",
  },
];

let lastUsbState = null;

function renderSteps() {
  const container = document.getElementById("steps");

  container.innerHTML = STEPS.map(
    (step, index) => `
      <article class="step">
        <div class="step-index">${index + 1}</div>
        <div>
          <h3>${step.title}</h3>
          <p>${step.description}</p>
        </div>
      </article>
    `
  ).join("");
}

function setInstallStatus(message, type = "") {
  const status = document.getElementById("install-status");
  status.textContent = message;
  status.className = `install-status ${type}`.trim();
}

async function refreshUsbStatus() {
  const status = document.getElementById("usb-status");
  const installButton = document.getElementById("install-ios");

  status.textContent = "Vérification en cours...";
  installButton.disabled = true;

  const result = await window.anylocSetup.checkUsb();
  lastUsbState = result;

  if (result.connected && result.deviceName) {
    status.textContent = `${result.deviceName} — ${result.message}`;
    installButton.disabled = false;
    return;
  }

  status.textContent = result.message;
}

async function installIos() {
  if (!lastUsbState?.connected) {
    setInstallStatus("Branche un iPhone avant d'installer.", "error");
    return;
  }

  setInstallStatus("Installation en cours...");
  const result = await window.anylocSetup.installIos({
    udid: lastUsbState.udid,
  });

  if (result.ok) {
    setInstallStatus(result.message, "ok");
    return;
  }

  setInstallStatus(result.message, "error");
}

async function init() {
  renderSteps();
  await refreshUsbStatus();

  document.getElementById("refresh-usb").addEventListener("click", () => {
    void refreshUsbStatus();
  });

  document.getElementById("install-ios").addEventListener("click", () => {
    void installIos();
  });

  const platform = await window.anylocSetup.getPlatform();
  document.title = `Anyloc Setup (${platform})`;
}

void init();
