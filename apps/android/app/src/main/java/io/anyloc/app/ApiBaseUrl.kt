package io.anyloc.app

import java.net.URI

object ApiBaseUrl {
    private const val DEFAULT_API_BASE_URL = "https://www.anyloc.io"

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
