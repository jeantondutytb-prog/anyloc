package io.anyloc.app

import org.junit.Assert.assertEquals
import org.junit.Test

class ApiBaseUrlTest {
    @Test
    fun `the bare anyloc_io is moved to www (links and saved settings)`() {
        assertEquals("https://www.anyloc.io", ApiBaseUrl.sanitize("https://anyloc.io"))
        assertEquals("https://www.anyloc.io", ApiBaseUrl.sanitize("anyloc.io"))
        assertEquals("https://www.anyloc.io", ApiBaseUrl.sanitize("http://ANYLOC.IO/"))
    }

    @Test
    fun `www, previews and local dev are kept`() {
        assertEquals("https://www.anyloc.io", ApiBaseUrl.sanitize("https://www.anyloc.io"))
        assertEquals("https://anyloc-abc.vercel.app", ApiBaseUrl.sanitize("https://anyloc-abc.vercel.app"))
        assertEquals("http://127.0.0.1:8787", ApiBaseUrl.sanitize("http://127.0.0.1:8787"))
    }

    @Test
    fun `unknown or empty values fall back to www`() {
        assertEquals("https://www.anyloc.io", ApiBaseUrl.sanitize("https://evil.example"))
        assertEquals("https://www.anyloc.io", ApiBaseUrl.sanitize(null))
        assertEquals("https://www.anyloc.io", ApiBaseUrl.sanitize(""))
    }
}
