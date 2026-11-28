"""Fails the build when the bundled Python cannot open the Wi-Fi tunnel.

Run by bundle-python.mjs with the bundled interpreter, after pruning. On
Python < 3.13, pymobiledevice3 needs sslpsk_pmd3 for the TCP tunnel and only
asserts it at connection time, on the customer's machine: a missing or
unloadable module (a wheel linked to another OpenSSL) must stop the build.
"""

import ssl
import sys

if sys.version_info < (3, 13):
    # Same import as pymobiledevice3, which turns any ImportError into None.
    from pymobiledevice3.remote.tunnel_service import SSLPSKContext

    if SSLPSKContext is None:
        # Re-import directly to show why (e.g. "DLL load failed").
        from sslpsk_pmd3.sslpsk import SSLPSKContext  # noqa: F811

    # Binds the PSK callbacks to the interpreter's OpenSSL, as a tunnel does.
    # Same protocol as pymobiledevice3's tunnel (deprecation warning expected).
    ctx = SSLPSKContext(ssl.PROTOCOL_TLSv1_2)
    ctx.psk = b"\0" * 16
    ctx.wrap_bio(ssl.MemoryBIO(), ssl.MemoryBIO(), server_side=False)

print(f"Tunnel check OK: Python {sys.version.split()[0]}, {ssl.OPENSSL_VERSION}")
