package io.anyloc.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import io.anyloc.app.api.AnylocApi
import io.anyloc.app.api.GeocodeResult
import io.anyloc.app.api.RemoteLocation
import io.anyloc.app.location.MockLocationService

class MainActivity : AppCompatActivity() {
    private lateinit var apiBaseUrlInput: EditText
    private lateinit var tokenInput: EditText
    private lateinit var searchInput: EditText
    private lateinit var searchResultsContainer: LinearLayout
    private lateinit var currentLocationText: TextView
    private lateinit var pauseButton: Button
    private lateinit var statusText: TextView

    private val mainHandler = Handler(Looper.getMainLooper())
    private var searchRunnable: Runnable? = null
    private var activeLocation: RemoteLocation? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        apiBaseUrlInput = findViewById(R.id.apiBaseUrlInput)
        tokenInput = findViewById(R.id.tokenInput)
        searchInput = findViewById(R.id.searchInput)
        searchResultsContainer = findViewById(R.id.searchResultsContainer)
        currentLocationText = findViewById(R.id.currentLocationText)
        pauseButton = findViewById(R.id.pauseButton)
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

        pauseButton.setOnClickListener {
            pauseLocation()
        }

        searchInput.addTextChangedListener(object : android.text.TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = Unit
            override fun afterTextChanged(s: android.text.Editable?) {
                scheduleSearch(s?.toString()?.trim().orEmpty())
            }
        })

        requestLocationPermissionIfNeeded()
        handleDeepLink(intent)
        refreshCurrentLocation()
        ensureSpoofingRunning()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleDeepLink(intent)
    }

    private fun handleDeepLink(intent: Intent?) {
        val data = intent?.data ?: return
        if (data.scheme != "anyloc") {
            return
        }

        val token = data.getQueryParameter("token")?.trim().orEmpty()
        if (token.isEmpty()) {
            return
        }

        val api = data.getQueryParameter("api")?.trim().orEmpty().ifEmpty {
            "https://anyloc.io"
        }

        apiBaseUrlInput.setText(api)
        tokenInput.setText(token)
        persistCredentials(api, token)
        ensureSpoofingRunning()
        statusText.text = "Configuré depuis le dashboard ✓"
        Toast.makeText(this, "Anyloc configuré automatiquement", Toast.LENGTH_SHORT).show()
    }

    override fun onResume() {
        super.onResume()
        refreshCurrentLocation()
        ensureSpoofingRunning()
    }

    private fun ensureSpoofingRunning() {
        val credentials = readCredentials() ?: return

        persistCredentials(credentials.first, credentials.second)
        MockLocationService.start(this, credentials.first, credentials.second)
        statusText.text = "En attente d'une position depuis le dashboard…"
    }

    private fun scheduleSearch(query: String) {
        searchRunnable?.let { mainHandler.removeCallbacks(it) }

        if (query.length < 2) {
            searchResultsContainer.visibility = View.GONE
            searchResultsContainer.removeAllViews()
            return
        }

        searchRunnable = Runnable {
            performSearch(query)
        }

        mainHandler.postDelayed(searchRunnable!!, 350)
    }

    private fun performSearch(query: String) {
        val credentials = readCredentials() ?: return

        Thread {
            val api = AnylocApi(credentials.first, credentials.second)
            val results = api.searchPlaces(query)

            runOnUiThread {
                renderSearchResults(results)
            }
        }.start()
    }

    private fun renderSearchResults(results: List<GeocodeResult>) {
        searchResultsContainer.removeAllViews()

        if (results.isEmpty()) {
            searchResultsContainer.visibility = View.GONE
            return
        }

        searchResultsContainer.visibility = View.VISIBLE

        results.forEach { result ->
            val button = Button(this).apply {
                text = buildString {
                    append(result.name)
                    if (result.subtitle.isNotBlank()) {
                        append("\n")
                        append(result.subtitle)
                    }
                }
                isAllCaps = false
                textAlignment = View.TEXT_ALIGNMENT_TEXT_START
                setOnClickListener {
                    activateLocation(result)
                }
            }

            searchResultsContainer.addView(button)
        }
    }

    private fun activateLocation(result: GeocodeResult) {
        val credentials = readCredentials()

        if (credentials == null) {
            Toast.makeText(this, "Configure d'abord ton token ci-dessous", Toast.LENGTH_SHORT).show()
            return
        }

        statusText.text = "Activation de ${result.name}..."
        searchResultsContainer.visibility = View.GONE
        searchInput.setText(result.name)

        Thread {
            val api = AnylocApi(credentials.first, credentials.second)
            val location = api.updateLocation(result.name, result.lat, result.lng, isActive = true)

            runOnUiThread {
                if (location == null) {
                    statusText.text = "Impossible d'activer cette position"
                    Toast.makeText(this, "Erreur — vérifie token et abonnement", Toast.LENGTH_SHORT).show()
                    return@runOnUiThread
                }

                activeLocation = location
                updateLocationDisplay(location)
                MockLocationService.start(this, credentials.first, credentials.second)
                statusText.text = "Position active · ${location.name}"
                Toast.makeText(this, "GPS activé sur ${location.name}", Toast.LENGTH_SHORT).show()
            }
        }.start()
    }

    private fun pauseLocation() {
        val credentials = readCredentials()
        val current = activeLocation

        if (credentials == null || current == null) {
            return
        }

        Thread {
            val api = AnylocApi(credentials.first, credentials.second)
            val location = api.updateLocation(current.name, current.lat, current.lng, isActive = false)

            runOnUiThread {
                if (location != null) {
                    activeLocation = location
                    updateLocationDisplay(location)
                    statusText.text = "Position en pause"
                }
            }
        }.start()
    }

    private fun refreshCurrentLocation() {
        val credentials = readCredentials() ?: return

        Thread {
            val api = AnylocApi(credentials.first, credentials.second)
            val location = api.fetchLocation()

            runOnUiThread {
                if (location != null) {
                    activeLocation = location
                    updateLocationDisplay(location)
                }
            }
        }.start()
    }

    private fun updateLocationDisplay(location: RemoteLocation) {
        currentLocationText.text = if (location.isActive) {
            "Actif · ${location.name} (${"%.4f".format(location.lat)}, ${"%.4f".format(location.lng)})"
        } else {
            "En pause · dernière position : ${location.name}"
        }

        pauseButton.visibility = if (location.isActive) View.VISIBLE else View.GONE
    }

    private fun readCredentials(): Pair<String, String>? {
        val apiBaseUrl = apiBaseUrlInput.text.toString().trim()
        val token = tokenInput.text.toString().trim()

        if (apiBaseUrl.isEmpty() || token.isEmpty()) {
            return null
        }

        return apiBaseUrl to token
    }

    private fun persistCredentials(apiBaseUrl: String, token: String) {
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .edit()
            .putString(KEY_API_BASE_URL, apiBaseUrl)
            .putString(KEY_DEVICE_TOKEN, token)
            .apply()
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
        val credentials = readCredentials()

        if (credentials == null) {
            Toast.makeText(this, "Renseigne l'URL et le token", Toast.LENGTH_SHORT).show()
            return
        }

        persistCredentials(credentials.first, credentials.second)

        Thread {
            val api = AnylocApi(credentials.first, credentials.second)
            val location = api.fetchLocation()

            runOnUiThread {
                if (location == null) {
                    statusText.text = "Échec de connexion — vérifie token et abonnement"
                    return@runOnUiThread
                }

                activeLocation = location
                updateLocationDisplay(location)
                statusText.text = if (location.isActive) {
                    "Connecté · ${location.name}"
                } else {
                    "Connecté · en attente d'une position depuis le dashboard"
                }
                ensureSpoofingRunning()
            }
        }.start()
    }

    private fun startSpoofing() {
        val credentials = readCredentials()

        if (credentials == null) {
            Toast.makeText(this, "Renseigne l'URL et le token", Toast.LENGTH_SHORT).show()
            return
        }

        persistCredentials(credentials.first, credentials.second)
        MockLocationService.start(this, credentials.first, credentials.second)
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
