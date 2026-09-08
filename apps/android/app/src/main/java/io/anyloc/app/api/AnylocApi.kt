package io.anyloc.app.api

import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.TimeUnit

data class RemoteLocation(
    val name: String,
    val lat: Double,
    val lng: Double,
    val accuracy: Double,
    val isActive: Boolean,
)

class AnylocApi(
    private val apiBaseUrl: String,
    private val deviceToken: String,
) {
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    fun fetchLocation(): RemoteLocation? {
        val url = "${apiBaseUrl.trimEnd('/')}/api/device/location"
        val request = Request.Builder()
            .url(url)
            .header("Authorization", "Bearer $deviceToken")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                return null
            }

            val body = response.body?.string() ?: return null
            val json = JSONObject(body)
            val location = json.optJSONObject("location") ?: return null

            return RemoteLocation(
                name = location.optString("name", "Position Anyloc"),
                lat = location.optDouble("lat"),
                lng = location.optDouble("lng"),
                accuracy = location.optDouble("accuracy", 10.0),
                isActive = location.optBoolean("isActive", false),
            )
        }
    }
}
