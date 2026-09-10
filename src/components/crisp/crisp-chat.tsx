import Script from "next/script";

const crispWebsiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;

export function CrispChat() {
  if (!crispWebsiteId) {
    return null;
  }

  return (
    <>
      <Script id="crisp-config" strategy="afterInteractive">
        {`window.$crisp=[];window.CRISP_WEBSITE_ID="${crispWebsiteId}";window.$crisp.push(["config","locale:force",["fr"]]);`}
      </Script>
      <Script src="https://client.crisp.chat/l.js" strategy="afterInteractive" />
    </>
  );
}
