package io.anyloc.app

import android.content.Context
import android.os.Build
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

/**
 * Sends app errors to anyloc.io (/api/app-error), where they land in PostHog on
 * the user behind the device token: logcat is unreachable on a customer's phone.
 * Never put the email or coordinates in it.
 */
object AppErrorReporter {
    /** The poll loop retries every few seconds: one report per scope is enough. */
    private const val MIN_INTERVAL_MS = 5 * 60 * 1000L

    private val lastSent = ConcurrentHashMap<String, Long>()
    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    fun report(
        context: Context,
        apiBaseUrl: String,
        deviceToken: String?,
        scope: String,
        error: Throwable,
        extra: Map<String, Any> = emptyMap(),
    ) {
        // No network on the user's side: nothing we could fix.
        if (error is IOException) return
        report(context, apiBaseUrl, deviceToken, scope, "${error::class.java.simpleName}: ${error.message}", extra)
    }

    fun report(
        context: Context,
        apiBaseUrl: String,
        deviceToken: String?,
        scope: String,
        message: String,
        extra: Map<String, Any> = emptyMap(),
    ) {
        val now = System.currentTimeMillis()
        val last = lastSent[scope]
        if (last != null && now - last < MIN_INTERVAL_MS) return
        lastSent[scope] = now

        val contextJson = JSONObject()
        extra.forEach { (key, value) -> contextJson.put(key, value) }
        contextJson.put("android_version", Build.VERSION.RELEASE)
        contextJson.put("device_model", "${Build.MANUFACTURER} ${Build.MODEL}")

        val body = JSONObject()
            .put("platform", "android")
            .put("scope", scope)
            .put("message", message)
            .put("app_version", appVersion(context))
            .put("context", contextJson)

        val request = Request.Builder()
            .url("${apiBaseUrl.trimEnd('/')}/api/app-error")
            .post(body.toString().toRequestBody("application/json".toMediaType()))
            .apply { if (deviceToken != null) header("Authorization", "Bearer $deviceToken") }
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) = Unit
            override fun onResponse(call: Call, response: Response) = response.close()
        })
    }

    private fun appVersion(context: Context): String = runCatching {
        val info = context.packageManager.getPackageInfo(context.packageName, 0)
        val code = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) info.longVersionCode else {
            @Suppress("DEPRECATION")
            info.versionCode.toLong()
        }
        "${info.versionName} ($code)"
    }.getOrDefault("?")
}
