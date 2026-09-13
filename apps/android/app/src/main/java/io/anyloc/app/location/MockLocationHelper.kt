package io.anyloc.app.location

import android.app.AppOpsManager
import android.content.Context
import android.location.Criteria
import android.location.LocationManager
import android.os.Build
import android.os.Process
import android.provider.Settings

object MockLocationHelper {
    fun isMockLocationAllowed(context: Context): Boolean {
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.LOLLIPOP_MR1) {
            @Suppress("DEPRECATION")
            return Settings.Secure.getInt(
                context.contentResolver,
                Settings.Secure.ALLOW_MOCK_LOCATION,
                0,
            ) != 0
        }

        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager
            ?: return false

        @Suppress("DEPRECATION")
        return appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_MOCK_LOCATION,
            Process.myUid(),
            context.packageName,
        ) == AppOpsManager.MODE_ALLOWED
    }

    fun canInjectMockLocation(locationManager: LocationManager): Boolean {
        return try {
            locationManager.addTestProvider(
                PROBE_PROVIDER,
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
            locationManager.removeTestProvider(PROBE_PROVIDER)
            true
        } catch (_: SecurityException) {
            false
        } catch (_: IllegalArgumentException) {
            try {
                locationManager.removeTestProvider(PROBE_PROVIDER)
            } catch (_: Exception) {
                // Ignore cleanup errors.
            }
            true
        }
    }

    private const val PROBE_PROVIDER = "anyloc_probe"
}
