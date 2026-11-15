import Script from "next/script";
import { CrispVisibility } from "@/components/crisp/crisp-visibility";
import { thirdPartyOffExpression } from "@/lib/third-party-off";

const crispWebsiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;

export function CrispChat() {
  if (!crispWebsiteId) {
    return null;
  }

  return (
    <>
      <Script id="crisp-config" strategy="afterInteractive">
        {`window.$crisp=[];window.CRISP_WEBSITE_ID="${crispWebsiteId}";window.$crisp.push(["config","locale:force",["fr"]]);
        if(!${thirdPartyOffExpression("crisp")}){var s=document.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;document.head.appendChild(s);}`}
      </Script>
      <CrispVisibility />
    </>
  );
}
