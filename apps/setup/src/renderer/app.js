const STEPS = [
  {
    title: "Active le mode développeur",
    description:
      "Réglages → Confidentialité et sécurité → Mode développeur. Redémarre et confirme.",
  },
  {
    title: "Installe LocalDevVPN",
    description:
      "Depuis l'App Store sur ton iPhone — utile pour renouveler l'app sans rebrancher l'ordi.",
  },
  {
    title: "Branche ton iPhone en USB",
    description:
      "Accepte « Faire confiance à cet ordinateur » sur l'écran du téléphone.",
  },
  {
    title: "Lance l'installation",
    description:
      "Anyloc Setup détectera ton iPhone et installera l'app Anyloc (bientôt disponible).",
  },
];

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

async function refreshUsbStatus() {
  const status = document.getElementById("usb-status");
  status.textContent = "Vérification en cours...";

  const result = await window.anylocSetup.checkUsb();

  if (result.connected && result.deviceName) {
    status.textContent = `iPhone détecté : ${result.deviceName}`;
    return;
  }

  status.textContent = result.message;
}

async function init() {
  renderSteps();
  await refreshUsbStatus();

  document.getElementById("refresh-usb").addEventListener("click", () => {
    void refreshUsbStatus();
  });

  const platform = await window.anylocSetup.getPlatform();
  document.title = `Anyloc Setup (${platform})`;
}

void init();
