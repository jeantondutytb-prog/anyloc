/**
 * Debug switch: `?off=crisp,posthog` (or `?off=all`) skips loading those
 * third-party scripts in this tab, to find which one breaks something on a
 * real device. Kept for the tab's session so it survives navigation;
 * `?off=` with no value clears it.
 */
const STORAGE_KEY = "anyloc:third-party-off";

export type ThirdParty = "crisp" | "crispbubble" | "posthog" | "amplitude" | "clarity";

function readOffList() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has("off")) {
      const value = params.get("off") ?? "";
      sessionStorage.setItem(STORAGE_KEY, value);
      return value.split(",");
    }
    return (sessionStorage.getItem(STORAGE_KEY) ?? "").split(",");
  } catch {
    return [];
  }
}

export function isThirdPartyOff(name: ThirdParty) {
  if (typeof window === "undefined") return false;
  const off = readOffList();
  return off.includes("all") || off.includes(name);
}

/** Inline-script version of `isThirdPartyOff`, for `<Script>` tags. */
export function thirdPartyOffExpression(name: ThirdParty) {
  return `(function(){var k=${JSON.stringify(STORAGE_KEY)},v="";try{var p=new URLSearchParams(location.search);if(p.has("off")){v=p.get("off")||"";sessionStorage.setItem(k,v)}else{v=sessionStorage.getItem(k)||""}}catch(e){}var l=v.split(",");return l.indexOf("all")>=0||l.indexOf(${JSON.stringify(name)})>=0})()`;
}
