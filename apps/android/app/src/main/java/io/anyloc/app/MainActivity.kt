package io.anyloc.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import io.anyloc.app.api.AnylocApi
import io.anyloc.app.location.MockLocationService

class MainActivity : AppCompatActivity() {
    private lateinit var apiBaseUrlInput: EditText
    private lateinit var tokenInput: EditText
    private lateinit var statusText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        apiBaseUrlInput = findViewById(R.id.apiBaseUrlInput)
        tokenInput = findViewById(R.id.tokenInput)
        statusText = findViewById(R.id.statusText)

        val prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        apiBaseUrlInput.setText(prefs.getString(KEY_API_BASE_URL, "https://anyloc.io"))
        tokenInput.setText(prefs.getString(KEY_DEVICE_TOKEN, ""))

        findViewById<Button>(R.id.testButton).setOnClickListener {
            testConnection()
        }

        findViewById<Button>(R.id.startButton).setOnClickListener {
            startSpoofing()
        }

        findViewById<Button>(R.id.stopButton).setOnClickListener {
            MockLocationService.stop(this)
            statusText.text = "Service arrêté"
        }

        requestLocationPermissionIfNeeded()
    }

    private fun requestLocationPermissionIfNeeded() {
        if (
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION),
                LOCATION_PERMISSION_REQUEST,
            )
        }
    }

    private fun testConnection() {
        val apiBaseUrl = apiBaseUrlInput.text.toString().trim()
        val token = tokenInput.text.toString().trim()

        if (apiBaseUrl.isEmpty() || token.isEmpty()) {
            Toast.makeText(this, "Renseigne l'URL et le token", Toast.LENGTH_SHORT).show()
            return
        }

        Thread {
            val api = AnylocApi(apiBaseUrl, token)
            val location = api.fetchLocation()

            runOnUiThread {
                if (location == null) {
                    statusText.text = "Échec de connexion — vérifie token et abonnement"
                    return@runOnUiThread
                }

                statusText.text = if (location.isActive) {
                    "Connecté · ${location.name} (${location.lat}, ${location.lng})"
                } else {
                    "Connecté · position en pause sur le dashboard"
                }
            }
        }.start()
    }

    private fun startSpoofing() {
        val apiBaseUrl = apiBaseUrlInput.text.toString().trim()
        val token = tokenInput.text.toString().trim()

        if (apiBaseUrl.isEmpty() || token.isEmpty()) {
            Toast.makeText(this, "Renseigne l'URL et le token", Toast.LENGTH_SHORT).show()
            return
        }

        getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .edit()
            .putString(KEY_API_BASE_URL, apiBaseUrl)
            .putString(KEY_DEVICE_TOKEN, token)
            .apply()

        MockLocationService.start(this, apiBaseUrl, token)
        statusText.text = "Service démarré — sélectionne Anyloc comme app de loc fictive"
        Toast.makeText(
            this,
            "Options développeur → Application de localisation fictive → Anyloc",
            Toast.LENGTH_LONG,
        ).show()
    }

    companion object {
        private const val PREFS_NAME = "anyloc_prefs"
        private const val KEY_API_BASE_URL = "api_base_url"
        private const val KEY_DEVICE_TOKEN = "device_token"
        private const val LOCATION_PERMISSION_REQUEST = 42
    }
}
