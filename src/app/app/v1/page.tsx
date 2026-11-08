import {
  remoteMetadata,
  remoteViewport,
  renderRemotePage,
  type RemotePageSearchParams,
} from "../remote-page";

export const metadata = remoteMetadata;
export const viewport = remoteViewport;

// Filming version: the full branded loading (about 6 s), for the TikTok test.
export default function RemoteAppHeavyLoadingPage({
  searchParams,
}: {
  searchParams: RemotePageSearchParams;
}) {
  return renderRemotePage({
    searchParams,
    path: "/app/v1",
    showcaseSpeed: "heavy",
  });
}
