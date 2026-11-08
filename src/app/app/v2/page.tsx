import {
  remoteMetadata,
  remoteViewport,
  renderRemotePage,
  type RemotePageSearchParams,
} from "../remote-page";

export const metadata = remoteMetadata;
export const viewport = remoteViewport;

// Filming version: a loading of about 1.5 s, for the TikTok test.
export default function RemoteAppFastLoadingPage({
  searchParams,
}: {
  searchParams: RemotePageSearchParams;
}) {
  return renderRemotePage({
    searchParams,
    path: "/app/v2",
    showcaseSpeed: "fast",
  });
}
