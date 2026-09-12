package io.anyloc.app.location

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Criteria
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.os.IBinder
import android.os.SystemClock
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import io.anyloc.app.R
import io.anyloc.app.api.AnylocApi
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class MockLocationService : Service() {
    private val scope = CoroutineScope(Dispatchers.IO)
    private var pollJob: Job? = null
    private var locationManager: LocationManager? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val apiBaseUrl = intent?.getStringExtra(EXTRA_API_BASE_URL) ?: return START_NOT_STICKY
        val token = intent.getStringExtra(EXTRA_DEVICE_TOKEN) ?: return START_NOT_STICKY

        startForeground(NOTIFICATION_ID, buildNotification("Synchronisation Anyloc"))
        locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
        ensureTestProvider()

        pollJob?.cancel()
        pollJob = scope.launch {
            val api = AnylocApi(apiBaseUrl, token)

            while (isActive) {
                val result = runCatching { api.fetchLocation() }.getOrNull()

                when {
                    result?.subscriptionInactive == true -> {
                        updateNotification("Essai terminé — renouvelle sur anyloc.io")
                    }
                    result?.location?.isActive == true -> {
                        val remote = result.location
                        pushMockLocation(remote.lat, remote.lng, remote.accuracy)
                        updateNotification(remote.name)
                    }
                    else -> {
                        updateNotification("En pause")
                    }
                }

                delay(POLL_INTERVAL_MS)
            }
        }

        return START_STICKY
    }

    override fun onDestroy() {
        pollJob?.cancel()
        removeTestProvider()
        super.onDestroy()
    }

    private fun ensureTestProvider() {
        val manager = locationManager ?: return

        if (!manager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
            return
        }

        try {
            manager.addTestProvider(
                LocationManager.GPS_PROVIDER,
                false,
                false,
                false,
                false,
                true,
                true,
                true,
                Criteria.POWER_LOW,
                Criteria.ACCURACY_FINE,
            )
            manager.setTestProviderEnabled(LocationManager.GPS_PROVIDER, true)
        } catch (_: SecurityException) {
            // Mock location app not selected in developer options.
        } catch (_: IllegalArgumentException) {
            // Provider already exists.
        }
    }

    private fun pushMockLocation(lat: Double, lng: Double, accuracy: Double) {
        val manager = locationManager ?: return

        if (
            ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED
        ) {
            return
        }

        val location = Location(LocationManager.GPS_PROVIDER).apply {
            latitude = lat
            longitude = lng
            this.accuracy = accuracy.toFloat()
            time = System.currentTimeMillis()
            elapsedRealtimeNanos = SystemClock.elapsedRealtimeNanos()
        }

        try {
            manager.setTestProviderLocation(LocationManager.GPS_PROVIDER, location)
        } catch (_: SecurityException) {
            // Mock location permission missing.
        }
    }

    private fun removeTestProvider() {
        val manager = locationManager ?: return

        try {
            manager.removeTestProvider(LocationManager.GPS_PROVIDER)
        } catch (_: Exception) {
            // Ignore cleanup errors.
        }
    }

    private fun buildNotification(content: String): Notification {
        val channelId = "anyloc_mock_location"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Anyloc GPS",
                NotificationManager.IMPORTANCE_LOW,
            )
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }

        return NotificationCompat.Builder(this, channelId)
            .setContentTitle("Anyloc actif")
            .setContentText(content)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .build()
    }

    private fun updateNotification(content: String) {
        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager.notify(NOTIFICATION_ID, buildNotification(content))
    }

    companion object {
        const val EXTRA_API_BASE_URL = "api_base_url"
        const val EXTRA_DEVICE_TOKEN = "device_token"
        private const val NOTIFICATION_ID = 1001
        private const val POLL_INTERVAL_MS = 15_000L

        fun start(context: Context, apiBaseUrl: String, deviceToken: String) {
            val intent = Intent(context, MockLocationService::class.java).apply {
                putExtra(EXTRA_API_BASE_URL, apiBaseUrl)
                putExtra(EXTRA_DEVICE_TOKEN, deviceToken)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, MockLocationService::class.java))
        }
    }
}
