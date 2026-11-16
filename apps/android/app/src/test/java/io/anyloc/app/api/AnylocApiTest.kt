package io.anyloc.app.api

import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test

/** Crisp ticket 16/11: a refused token (401) must not look like a network or subscription error. */
class AnylocApiTest {
    private lateinit var server: MockWebServer
    private lateinit var api: AnylocApi

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        api = AnylocApi(server.url("/").toString(), "anyloc_dead")
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `GET location with a refused token throws DeviceUnlinkedException`() {
        server.enqueue(MockResponse().setResponseCode(401).setBody("""{"error":"Token appareil invalide."}"""))

        try {
            api.fetchLocation()
            fail("expected DeviceUnlinkedException")
        } catch (error: DeviceUnlinkedException) {
            assertTrue(error.message!!.contains("GET /api/device/location"))
        }
        assertEquals("Bearer anyloc_dead", server.takeRequest().getHeader("Authorization"))
    }

    @Test
    fun `PUT location with a refused token throws DeviceUnlinkedException`() {
        server.enqueue(MockResponse().setResponseCode(401))

        try {
            api.updateLocation("Paris", 48.85, 2.35)
            fail("expected DeviceUnlinkedException")
        } catch (error: DeviceUnlinkedException) {
            assertTrue(error.message!!.contains("PUT /api/device/location"))
        }
    }

    @Test
    fun `inactive subscription (403) is still reported as such, not as unlinked`() {
        server.enqueue(MockResponse().setResponseCode(403).setBody("""{"error":"Abonnement inactif."}"""))

        val result = api.fetchLocation()

        assertTrue(result.subscriptionInactive)
        assertNull(result.location)
    }

    @Test
    fun `PUT refused for an inactive subscription (403) returns null without throwing`() {
        server.enqueue(MockResponse().setResponseCode(403))

        assertNull(api.updateLocation("Paris", 48.85, 2.35))
    }

    @Test
    fun `a server error (500) is not mistaken for an unlinked phone`() {
        server.enqueue(MockResponse().setResponseCode(500))

        val result = api.fetchLocation()

        assertNull(result.location)
        assertEquals(false, result.subscriptionInactive)
    }

    @Test
    fun `valid token returns the location`() {
        server.enqueue(
            MockResponse().setBody(
                """{"location":{"name":"Paris","lat":48.85,"lng":2.35,"accuracy":10,"isActive":true}}"""
            )
        )

        val location = api.fetchLocation().location

        assertEquals("Paris", location?.name)
        assertEquals(true, location?.isActive)
    }
}
