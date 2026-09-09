"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type SetupQrCodeProps = {
  value: string;
  label?: string;
};

export function SetupQrCode({ value, label }: SetupQrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void QRCode.toDataURL(value, {
      width: 168,
      margin: 1,
      color: {
        dark: "#18181b",
        light: "#ffffff",
      },
    }).then((url) => {
      if (!cancelled) {
        setDataUrl(url);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!dataUrl) {
    return (
      <div className="flex h-[168px] w-[168px] items-center justify-center rounded-xl bg-zinc-100 text-xs text-zinc-400">
        QR…
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <img
        src={dataUrl}
        alt="QR code de configuration Anyloc"
        width={168}
        height={168}
        className="rounded-xl border border-zinc-200 bg-white p-1"
      />
      {label ? (
        <p className="max-w-[180px] text-center text-xs text-zinc-500">{label}</p>
      ) : null}
    </div>
  );
}
