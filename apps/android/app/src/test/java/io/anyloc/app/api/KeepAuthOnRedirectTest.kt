package io.anyloc.app.api

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import java.net.InetAddress

/**
 * Replays anyloc.io → 308 → www.anyloc.io with two local servers on two host
 * names (127.0.0.1 plays anyloc.io, localhost plays www.anyloc.io).
 */
class KeepAuthOnRedirectTest {
    private lateinit var apex: MockWebServer
    private lateinit var www: MockWebServer
    private val hosts = setOf("127.0.0.1", "localhost")

    @Before
    fun setUp() {
        val loopback = InetAddress.getByName("127.0.0.1")
        apex = MockWebServer().apply { start(loopback, 0) }
        www = MockWebServer().apply { start(loopback, 0) }
    }

    @After
    fun tearDown() {
        apex.shutdown()
        www.shutdown()
    }

    private fun redirectToWww() {
        apex.enqueue(
            MockResponse()
                .setResponseCode(308)
                .setHeader("Location", "http://localhost:${www.port}/api/device/location")
        )
        www.enqueue(MockResponse().setBody("{}"))
    }

    private fun get(client: OkHttpClient) {
        client.newCall(
            Request.Builder()
                .url("http://127.0.0.1:${apex.port}/api/device/location")
                .header("Authorization", "Bearer anyloc_live")
                .build()
        ).execute().close()
    }

    @Test
    fun `without the fix OkHttp drops the token on the redirect (the 16-11 bug)`() {
        redirectToWww()

        get(OkHttpClient())

        apex.takeRequest()
        assertNull(www.takeRequest().getHeader("Authorization"))
    }

    @Test
    fun `GET redirected to the other host arrives with the token`() {
        redirectToWww()

        get(OkHttpClient.Builder().addNetworkInterceptor(KeepAuthOnRedirect(hosts)).build())

        apex.takeRequest()
        assertEquals("Bearer anyloc_live", www.takeRequest().getHeader("Authorization"))
    }

    @Test
    fun `PUT redirected with 308 keeps its body and the token`() {
        redirectToWww()
        val client = OkHttpClient.Builder().addNetworkInterceptor(KeepAuthOnRedirect(hosts)).build()

        client.newCall(
            Request.Builder()
                .url("http://127.0.0.1:${apex.port}/api/device/location")
                .header("Authorization", "Bearer anyloc_live")
                .put("""{"name":"Paris"}""".toRequestBody("application/json".toMediaType()))
                .build()
        ).execute().close()

        apex.takeRequest()
        val arrived = www.takeRequest()
        assertEquals("PUT", arrived.method)
        assertEquals("""{"name":"Paris"}""", arrived.body.readUtf8())
        assertEquals("Bearer anyloc_live", arrived.getHeader("Authorization"))
    }

    @Test
    fun `the token never follows a redirect to a host that isn't ours`() {
        redirectToWww()

        get(OkHttpClient.Builder().addNetworkInterceptor(KeepAuthOnRedirect(setOf("127.0.0.1"))).build())

        apex.takeRequest()
        assertNull(www.takeRequest().getHeader("Authorization"))
    }
}
