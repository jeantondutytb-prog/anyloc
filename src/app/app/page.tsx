import {
  remoteMetadata,
  remoteViewport,
  renderRemotePage,
  type RemotePageSearchParams,
} from "./remote-page";

export const metadata = remoteMetadata;
export const viewport = remoteViewport;

export default function RemoteAppPage({
  searchParams,
}: {
  searchParams: RemotePageSearchParams;
}) {
  return renderRemotePage({ searchParams, path: "/app" });
}
