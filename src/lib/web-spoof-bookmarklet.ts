export type WebSpoofPayload = {
  origin: string;
  token: string;
  lat: number;
  lng: number;
  accuracy: number;
  name: string;
};

export function buildWebSpoofBookmarklet(payload: WebSpoofPayload) {
  const data = JSON.stringify({
    o: payload.origin.replace(/\/$/, ""),
    t: payload.token,
    lat: Number(payload.lat.toFixed(6)),
    lng: Number(payload.lng.toFixed(6)),
    a: payload.accuracy || 10,
    n: payload.name,
  });

  const source = `(()=>{var p=${data},C={lat:p.lat,lng:p.lng,accuracy:p.a,name:p.n};function pos(){return{coords:{latitude:C.lat,longitude:C.lng,accuracy:C.accuracy,altitude:null,altitudeAccuracy:null,heading:null,speed:null},timestamp:Date.now()}}function pull(){fetch(p.o+"/api/device/location",{headers:{Authorization:"Bearer "+p.t}}).then(function(r){return r.json()}).then(function(d){if(d&&d.location&&d.location.isActive){C.lat=d.location.lat;C.lng=d.location.lng;C.accuracy=d.location.accuracy||C.accuracy;C.name=d.location.name}}).catch(function(){})}pull();setInterval(pull,4000);var g=navigator.geolocation;if(!g){alert("GPS navigateur indisponible");return}g.getCurrentPosition=function(s){s(pos())};g.watchPosition=function(s){s(pos());return setInterval(function(){s(pos())},3000)};var t=document.createElement("div");t.textContent="Anyloc · "+C.name;t.setAttribute("style","position:fixed;z-index:2147483647;left:50%;bottom:20px;transform:translateX(-50%);background:#ec4899;color:#fff;padding:10px 14px;border-radius:999px;font:600 13px/1.2 system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.25)");document.documentElement.appendChild(t);setTimeout(function(){t.remove()},3500)})()`;

  return `javascript:${source}`;
}
