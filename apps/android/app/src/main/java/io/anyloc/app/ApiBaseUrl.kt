package io.anyloc.app

import java.net.URI

object ApiBaseUrl {
    private const val DEFAULT_API_BASE_URL = "https://www.anyloc.io"

    /**
     * anyloc.io answers every request with a 308 to www.anyloc.io, and OkHttp
     * drops the Authorization header when a redirect changes host: every call
     * then answered 401. Links and saved settings with the bare domain (phones
     * linked before the fix) are moved to www when read.
     */
    private const val APEX_HOST = "anyloc.io"

    /** Our own hosts: the device token may follow a redirect between them. */
    val ANYLOC_HOSTS = setOf(APEX_HOST, "www.anyloc.io")

    private val allowedHosts = setOf(
        "anyloc.io",
        "www.anyloc.io",
        "localhost",
        "127.0.0.1",
    )

    fun sanitize(raw: String?): String {
        val value = raw?.trim().orEmpty()

        if (value.isEmpty()) {
            return DEFAULT_API_BASE_URL
        }

        return try {
            val uri = URI(if (value.contains("://")) value else "https://$value")
            val host = uri.host?.trim()?.lowercase()?.removeSuffix(".") ?: return DEFAULT_API_BASE_URL

            if (!isAllowedHost(host)) {
                DEFAULT_API_BASE_URL
            } else if (host == APEX_HOST) {
                DEFAULT_API_BASE_URL
            } else {
                val scheme = uri.scheme ?: "https"
                val port = uri.port
                if (port > 0) {
                    "$scheme://$host:$port"
                } else {
                    "$scheme://$host"
                }
            }
        } catch (_: Exception) {
            DEFAULT_API_BASE_URL
        }
    }

    private fun isAllowedHost(host: String): Boolean {
        if (allowedHosts.contains(host)) {
            return true
        }

        return host.endsWith(".vercel.app")
    }
}
