export type DashboardTab = "install" | "account";

export function getDashboardBasePath(pathname: string) {
  return pathname.startsWith("/preview/dashboard")
    ? "/preview/dashboard"
    : "/dashboard";
}

export function dashboardHref(basePath: string, tab?: DashboardTab) {
  return tab ? `${basePath}?tab=${tab}` : basePath;
}

export function isDashboardHomePath(pathname: string) {
  return pathname === "/dashboard" || pathname === "/preview/dashboard";
}
