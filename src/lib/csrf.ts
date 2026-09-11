export function isCrossSiteMutation(request: Request) {
  const secFetchSite = request.headers.get("sec-fetch-site");

  return secFetchSite === "cross-site";
}

export function rejectCrossSiteMutation(request: Request) {
  if (isCrossSiteMutation(request)) {
    return Response.json({ error: "Requête interdite." }, { status: 403 });
  }

  return null;
}
