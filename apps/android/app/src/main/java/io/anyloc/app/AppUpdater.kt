package io.anyloc.app

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import io.anyloc.app.api.AnylocApi
import io.anyloc.app.api.AppUpdate
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.util.concurrent.TimeUnit

/**
 * In-app updates: the APK is installed outside the Play Store, so the app asks
 * anyloc.io for the latest build, downloads it and hands it to Android's installer.
 * Only works between builds signed with the same release key.
 */
class AppUpdater(private val activity: AppCompatActivity) {
    // Lazy: the updater is built with the activity, before it has a context.
    private val prefs by lazy { activity.getSharedPreferences(PREFS_NAME, AppCompatActivity.MODE_PRIVATE) }
    private var pendingInstall: File? = null
    private var checking = false

    val installedVersionCode: Long
        get() = runCatching {
            activity.packageManager.getPackageInfo(activity.packageName, 0).longVersionCode
        }.getOrDefault(0L)

    /** [manual]: from the profile page, so always check and say when already up to date. */
    fun check(credentials: Pair<String, String>, manual: Boolean = false) {
        val now = System.currentTimeMillis()
        if (checking) return
        if (!manual && now - prefs.getLong(KEY_LAST_CHECK, 0L) < AUTO_CHECK_INTERVAL_MS) return
        checking = true

        Thread {
            val update = runCatching {
                AnylocApi(credentials.first, credentials.second).fetchLatestVersion()
            }.getOrNull()

            activity.runOnUiThread {
                checking = false
                if (activity.isFinishing) return@runOnUiThread
                if (update == null) {
                    if (manual) toast("Impossible de vérifier — réessaie")
                    return@runOnUiThread
                }
                prefs.edit().putLong(KEY_LAST_CHECK, now).apply()
                if (update.versionCode > installedVersionCode) {
                    offer(update)
                } else if (manual) {
                    toast("Anyloc est à jour")
                }
            }
        }.start()
    }

    /** Back from "Installer des applis inconnues": carry on with the install. */
    fun resumePendingInstall() {
        val file = pendingInstall ?: return
        if (activity.packageManager.canRequestPackageInstalls()) {
            pendingInstall = null
            install(file)
        }
    }

    private fun offer(update: AppUpdate) {
        MaterialAlertDialogBuilder(activity)
            .setTitle("Nouvelle version disponible")
            .setMessage("Anyloc ${update.versionName} est prête. La mise à jour prend quelques secondes, ta position reste active.")
            .setNegativeButton("Plus tard", null)
            .setPositiveButton("Mettre à jour") { _, _ -> download(update) }
            .show()
    }

    private fun download(update: AppUpdate) {
        val progress = ProgressBar(activity, null, android.R.attr.progressBarStyleHorizontal).apply { max = 100 }
        val label = TextView(activity).apply { text = "Téléchargement…" }
        val content = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            val pad = (24 * resources.displayMetrics.density).toInt()
            setPadding(pad, pad / 2, pad, 0)
            addView(progress, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
            addView(label)
        }
        val dialog: AlertDialog = MaterialAlertDialogBuilder(activity)
            .setTitle("Mise à jour d'Anyloc")
            .setView(content)
            .setCancelable(false)
            .show()

        Thread {
            val file = File(File(activity.cacheDir, "updates").apply { mkdirs() }, "Anyloc-${update.versionCode}.apk")
            val ok = runCatching {
                val client = OkHttpClient.Builder().readTimeout(60, TimeUnit.SECONDS).build()
                client.newCall(Request.Builder().url(update.downloadUrl).build()).execute().use { response ->
                    check(response.isSuccessful) { "HTTP ${response.code}" }
                    val body = response.body ?: error("empty body")
                    val total = body.contentLength()
                    body.byteStream().use { input ->
                        file.outputStream().use { output ->
                            val buffer = ByteArray(64 * 1024)
                            var read = 0L
                            var lastPercent = -1
                            while (true) {
                                val n = input.read(buffer)
                                if (n < 0) break
                                output.write(buffer, 0, n)
                                read += n
                                val percent = if (total > 0) (read * 100 / total).toInt() else 0
                                if (percent != lastPercent) {
                                    lastPercent = percent
                                    activity.runOnUiThread {
                                        progress.progress = percent
                                        label.text = "Téléchargement… $percent %"
                                    }
                                }
                            }
                        }
                    }
                }
            }.isSuccess

            activity.runOnUiThread {
                dialog.dismiss()
                if (!ok) {
                    file.delete()
                    toast("Téléchargement impossible — réessaie")
                    return@runOnUiThread
                }
                install(file)
            }
        }.start()
    }

    private fun install(file: File) {
        // First update: Android asks once to allow Anyloc to install apps.
        if (!activity.packageManager.canRequestPackageInstalls()) {
            pendingInstall = file
            MaterialAlertDialogBuilder(activity)
                .setTitle("Une autorisation à donner")
                .setMessage("Active « Autoriser cette source » pour Anyloc, puis reviens dans l'app : la mise à jour s'installera.")
                .setPositiveButton("Ouvrir le réglage") { _, _ ->
                    activity.startActivity(
                        Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${activity.packageName}"))
                    )
                }
                .setNegativeButton("Annuler") { _, _ -> pendingInstall = null }
                .show()
            return
        }

        val uri = FileProvider.getUriForFile(activity, "${activity.packageName}.updates", file)
        activity.startActivity(
            Intent(Intent.ACTION_VIEW)
                .setDataAndType(uri, "application/vnd.android.package-archive")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        )
    }

    private fun toast(text: String) = Toast.makeText(activity, text, Toast.LENGTH_SHORT).show()

    companion object {
        private const val PREFS_NAME = "anyloc_prefs"
        private const val KEY_LAST_CHECK = "update_last_check"
        private const val AUTO_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000L
    }
}
