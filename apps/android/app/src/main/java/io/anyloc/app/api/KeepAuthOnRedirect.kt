package io.anyloc.app.api

import io.anyloc.app.ApiBaseUrl
import okhttp3.Interceptor
import okhttp3.Response

/**
 * OkHttp removes the Authorization header when it follows a redirect to another
 * host, e.g. anyloc.io → www.anyloc.io (308): the API then answered 401 to every
 * call. This network interceptor puts the device token back, only when both the
 * first and the redirected host are ours and the redirect doesn't drop HTTPS.
 */
class KeepAuthOnRedirect(
    private val trustedHosts: Set<String> = ApiBaseUrl.ANYLOC_HOSTS,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val original = chain.call().request()
        val auth = original.header("Authorization")

        val restore = auth != null &&
            request.header("Authorization") == null &&
            request.url.host != original.url.host &&
            original.url.host in trustedHosts &&
            request.url.host in trustedHosts &&
            (request.url.isHttps || !original.url.isHttps)

        return chain.proceed(
            if (restore) request.newBuilder().header("Authorization", auth!!).build() else request
        )
    }
}
