package io.anyloc.app.api

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

data class RemoteLocation(
    val name: String,
    val lat: Double,
    val lng: Double,
    val accuracy: Double,
    val isActive: Boolean,
)

data class LocationFetchResult(
    val location: RemoteLocation? = null,
    val subscriptionInactive: Boolean = false,
    val inactiveDetails: SubscriptionInactiveDetails? = null,
)

/** Account shown on the profile page (GET /api/device/me). */
data class DeviceProfile(
    val email: String?,
    val planId: String?,
    val isTrial: Boolean,
)

/** Latest APK published by CI (GET /api/device/app-update). */
data class AppUpdate(
    val versionCode: Long,
    val versionName: String,
    val downloadUrl: String,
)

data class GeocodeResult(
    val id: String,
    val name: String,
    val lat: Double,
    val lng: Double,
    val subtitle: String,
)

class AnylocApi(
    private val apiBaseUrl: String,
    private val deviceToken: String,
) {
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    private val baseUrl: String
        get() = apiBaseUrl.trimEnd('/')

    fun fetchLocation(): LocationFetchResult {
        val request = Request.Builder()
            .url("$baseUrl/api/device/location")
            .header("Authorization", "Bearer $deviceToken")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            val body = response.body?.string().orEmpty()

            if (response.code == 403) {
                val inactive = SubscriptionInactiveDetails.fromJson(
                    runCatching { JSONObject(body).optJSONObject("inactive") }.getOrNull()
                )

                return LocationFetchResult(
                    subscriptionInactive = true,
                    inactiveDetails = inactive ?: SubscriptionInactiveDetails.fallback(baseUrl),
                )
            }

            if (!response.isSuccessful) {
                return LocationFetchResult()
            }

            return LocationFetchResult(location = parseLocationResponse(body))
        }
    }

    fun updateLocation(
        name: String,
        lat: Double,
        lng: Double,
        isActive: Boolean = true,
    ): RemoteLocation? {
        val json = JSONObject()
            .put("name", name)
            .put("lat", lat)
            .put("lng", lng)
            .put("isActive", isActive)
            .put("mode", "static")

        val request = Request.Builder()
            .url("$baseUrl/api/device/location")
            .header("Authorization", "Bearer $deviceToken")
            .put(json.toString().toRequestBody("application/json".toMediaType()))
            .build()

        client.newCall(request).execute().use { response ->
            if (response.code == 403) {
                return null
            }

            if (!response.isSuccessful) {
                return null
            }

            val body = response.body?.string() ?: return null
            return parseLocationResponse(body)
        }
    }

    fun fetchProfile(): DeviceProfile? {
        val request = Request.Builder()
            .url("$baseUrl/api/device/me")
            .header("Authorization", "Bearer $deviceToken")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                return null
            }

            val json = JSONObject(response.body?.string().orEmpty())
            val subscription = json.optJSONObject("subscription")
            val active = subscription?.optBoolean("active", false) == true

            return DeviceProfile(
                email = json.optJSONObject("user")?.stringOrNull("email"),
                planId = if (active) subscription?.stringOrNull("planId") else null,
                isTrial = active && subscription?.optBoolean("isTrial", false) == true,
            )
        }
    }

    fun fetchLatestVersion(): AppUpdate? {
        val request = Request.Builder()
            .url("$baseUrl/api/device/app-update")
            .header("Authorization", "Bearer $deviceToken")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                return null
            }

            val json = JSONObject(response.body?.string().orEmpty())
            val url = json.stringOrNull("downloadUrl") ?: return null

            return AppUpdate(
                versionCode = json.optLong("versionCode"),
                versionName = json.optString("versionName"),
                downloadUrl = url,
            )
        }
    }

    fun searchPlaces(query: String): List<GeocodeResult> {
        if (query.length < 2) {
            return emptyList()
        }

        val request = Request.Builder()
            .url("$baseUrl/api/geocode?q=${java.net.URLEncoder.encode(query, "UTF-8")}")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                return emptyList()
            }

            val body = response.body?.string() ?: return emptyList()
            val json = JSONObject(body)
            val results = json.optJSONArray("results") ?: return emptyList()

            return (0 until results.length()).mapNotNull { index ->
                val item = results.optJSONObject(index) ?: return@mapNotNull null

                GeocodeResult(
                    id = item.optString("id", "$index"),
                    name = item.optString("name"),
                    lat = item.optDouble("lat"),
                    lng = item.optDouble("lng"),
                    subtitle = item.optString("subtitle"),
                )
            }.filter { it.name.isNotBlank() }
        }
    }

    private fun parseLocationResponse(body: String): RemoteLocation? {
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

/** `optString` turns a JSON null into the text "null". */
private fun JSONObject.stringOrNull(key: String): String? =
    if (isNull(key)) null else optString(key).ifBlank { null }
