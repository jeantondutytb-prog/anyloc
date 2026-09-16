package io.anyloc.app.location

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.app.PendingIntent
import android.content.Intent
import android.content.Context
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.location.Criteria
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.os.IBinder
import android.os.SystemClock
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import io.anyloc.app.R
import io.anyloc.app.SubscriptionInactiveActivity
import io.anyloc.app.api.AnylocApi
import io.anyloc.app.api.SubscriptionInactiveDetails
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

        if (!hasRequiredPermissions()) {
            Log.w(TAG, "Missing runtime permissions for foreground mock location service")
            stopSelf()
            return START_NOT_STICKY
        }

        try {
            ServiceCompat.startForeground(
                this,
                NOTIFICATION_ID,
                buildNotification("Synchronisation Anyloc"),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION,
            )
        } catch (error: Exception) {
            Log.e(TAG, "Unable to start foreground service", error)
            stopSelf()
            return START_NOT_STICKY
        }

        locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager

        if (!MockLocationHelper.isMockLocationAllowed(this)) {
            Log.w(TAG, "Anyloc is not selected as mock location app")
            stopSelf()
            return START_NOT_STICKY
        }

        ensureTestProvider()

        pollJob?.cancel()
        pollJob = scope.launch {
            val api = AnylocApi(apiBaseUrl, token)

            while (isActive) {
                val result = runCatching { api.fetchLocation() }.getOrNull()

                when {
                    result?.subscriptionInactive == true -> {
                        val details = result.inactiveDetails
                            ?: SubscriptionInactiveDetails.fallback(apiBaseUrl)
                        showInactiveNotification(details)
                        stopSelf()
                        return@launch
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

    private fun hasRequiredPermissions(): Boolean {
        val hasLocationPermission =
            ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED ||
                ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED

        if (!hasLocationPermission) {
            return false
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            return ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.FOREGROUND_SERVICE_LOCATION,
            ) == PackageManager.PERMISSION_GRANTED
        }

        return true
    }

    private fun ensureTestProvider() {
        val manager = locationManager ?: return

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
        } catch (_: IllegalArgumentException) {
            // GPS provider already exists — keep going.
        } catch (_: SecurityException) {
            return
        }

        try {
            manager.setTestProviderEnabled(LocationManager.GPS_PROVIDER, true)
        } catch (_: Exception) {
            // Provider cannot be enabled yet.
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
        } catch (_: IllegalArgumentException) {
            ensureTestProvider()
            try {
                manager.setTestProviderLocation(LocationManager.GPS_PROVIDER, location)
            } catch (_: Exception) {
                // Provider still unavailable.
            }
        }
    }

    private fun removeTestProvider() {
        val manager = locationManager ?: return

        try {
            manager.setTestProviderEnabled(LocationManager.GPS_PROVIDER, false)
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

    private fun showInactiveNotification(details: SubscriptionInactiveDetails) {
        val channelId = "anyloc_subscription_inactive"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Abonnement Anyloc",
                NotificationManager.IMPORTANCE_HIGH,
            )
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }

        val intent = SubscriptionInactiveActivity.createIntent(this, details)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle(details.title)
            .setContentText(details.ctaLabel)
            .setStyle(NotificationCompat.BigTextStyle().bigText(details.description))
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        getSystemService(NotificationManager::class.java)
            .notify(NOTIFICATION_ID + 1, notification)
    }

    companion object {
        const val EXTRA_API_BASE_URL = "api_base_url"
        const val EXTRA_DEVICE_TOKEN = "device_token"
        private const val TAG = "MockLocationService"
        private const val NOTIFICATION_ID = 1001
        private const val POLL_INTERVAL_MS = 15_000L

        fun start(context: Context, apiBaseUrl: String, deviceToken: String): Boolean {
            val intent = Intent(context, MockLocationService::class.java).apply {
                putExtra(EXTRA_API_BASE_URL, apiBaseUrl)
                putExtra(EXTRA_DEVICE_TOKEN, deviceToken)
            }

            return try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
                true
            } catch (error: Exception) {
                Log.e(TAG, "Failed to start mock location service", error)
                false
            }
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, MockLocationService::class.java))
        }
    }
}
