package io.anyloc.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.ColorStateList
import android.graphics.Typeface
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.provider.Settings
import android.text.SpannableString
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.Chronometer
import android.widget.EditText
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.core.view.updatePadding
import io.anyloc.app.api.AnylocApi
import io.anyloc.app.api.DeviceProfile
import io.anyloc.app.api.GeocodeResult
import io.anyloc.app.api.RemoteLocation
import io.anyloc.app.api.SubscriptionInactiveDetails
import io.anyloc.app.location.MockLocationHelper
import io.anyloc.app.location.MockLocationService
import org.maplibre.android.MapLibre
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.camera.CameraUpdateFactory
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView
import org.maplibre.android.maps.Style
import org.maplibre.android.style.layers.Property
import org.maplibre.android.style.layers.PropertyFactory
import org.maplibre.android.style.layers.SymbolLayer
import org.maplibre.android.style.sources.GeoJsonSource
import org.maplibre.android.utils.BitmapUtils
import org.maplibre.geojson.FeatureCollection
import org.maplibre.geojson.Point
import kotlin.math.abs

class MainActivity : AppCompatActivity() {
    /** Place picked on the map or in search, not necessarily the active one. */
    private data class SelectedPlace(val name: String, val lat: Double, val lng: Double)

    private lateinit var mapView: MapView
    private var map: MapLibreMap? = null
    private var pinSource: GeoJsonSource? = null

    private lateinit var topColumn: LinearLayout
    private lateinit var sheet: LinearLayout
    private lateinit var searchInput: EditText
    private lateinit var clearSearchButton: ImageButton
    private lateinit var searchResultsContainer: LinearLayout
    private lateinit var captionText: TextView
    private lateinit var placeNameText: TextView
    private lateinit var coordsText: TextView
    private lateinit var recenterButton: ImageButton
    private lateinit var teleportButton: LinearLayout
    private lateinit var teleportProgress: ProgressBar
    private lateinit var teleportIcon: ImageView
    private lateinit var activeBar: LinearLayout
    private lateinit var activeTimer: Chronometer
    private lateinit var pauseButton: TextView
    private lateinit var statusText: TextView

    private lateinit var tabTeleport: LinearLayout
    private lateinit var tabExplore: LinearLayout
    private lateinit var teleportPanel: LinearLayout
    private lateinit var explorePanel: LinearLayout
    private lateinit var spotCategoriesContainer: LinearLayout
    private lateinit var spotsContainer: LinearLayout
    private lateinit var showcase: TeleportShowcase

    private lateinit var settingsOverlay: LinearLayout
    private lateinit var profileEmail: TextView
    private lateinit var profileRole: TextView
    private lateinit var planName: TextView
    private lateinit var planCards: LinearLayout
    private lateinit var apiBaseUrlInput: EditText
    private lateinit var tokenInput: EditText
    private lateinit var settingsStatusText: TextView

    private lateinit var setupOverlay: LinearLayout
    private lateinit var setupTitle: TextView
    private lateinit var setupBody: TextView
    private lateinit var setupPrimaryButton: TextView
    private lateinit var setupSecondaryButton: TextView
    private lateinit var setupDoneButton: TextView

    private val mainHandler = Handler(Looper.getMainLooper())
    private var searchRunnable: Runnable? = null
    private var activeLocation: RemoteLocation? = null
    private var selected: SelectedPlace? = null
    private var isApplying = false
    private var exploring = false
    private var spotCategory = "all"
    private var pendingSpoofingStart = false
    private var setupHintShown = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        MapLibre.getInstance(this)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        setContentView(R.layout.activity_main)

        mapView = findViewById(R.id.mapView)
        topColumn = findViewById(R.id.topColumn)
        sheet = findViewById(R.id.sheet)
        searchInput = findViewById(R.id.searchInput)
        clearSearchButton = findViewById(R.id.clearSearchButton)
        searchResultsContainer = findViewById(R.id.searchResultsContainer)
        captionText = findViewById(R.id.captionText)
        placeNameText = findViewById(R.id.placeNameText)
        coordsText = findViewById(R.id.coordsText)
        recenterButton = findViewById(R.id.recenterButton)
        teleportButton = findViewById(R.id.teleportButton)
        teleportProgress = findViewById(R.id.teleportProgress)
        teleportIcon = findViewById(R.id.teleportIcon)
        activeBar = findViewById(R.id.activeBar)
        activeTimer = findViewById(R.id.activeTimer)
        pauseButton = findViewById(R.id.pauseButton)
        statusText = findViewById(R.id.statusText)
        settingsOverlay = findViewById(R.id.settingsOverlay)
        tabTeleport = findViewById(R.id.tabTeleport)
        tabExplore = findViewById(R.id.tabExplore)
        teleportPanel = findViewById(R.id.teleportPanel)
        explorePanel = findViewById(R.id.explorePanel)
        spotCategoriesContainer = findViewById(R.id.spotCategoriesContainer)
        spotsContainer = findViewById(R.id.spotsContainer)
        showcase = TeleportShowcase(findViewById(R.id.showcaseOverlay))
        profileEmail = findViewById(R.id.profileEmail)
        profileRole = findViewById(R.id.profileRole)
        planName = findViewById(R.id.planName)
        planCards = findViewById(R.id.planCards)
        apiBaseUrlInput = findViewById(R.id.apiBaseUrlInput)
        tokenInput = findViewById(R.id.tokenInput)
        settingsStatusText = findViewById(R.id.settingsStatusText)
        setupOverlay = findViewById(R.id.setupOverlay)
        setupTitle = findViewById(R.id.setupTitle)
        setupBody = findViewById(R.id.setupBody)
        setupPrimaryButton = findViewById(R.id.setupPrimaryButton)
        setupSecondaryButton = findViewById(R.id.setupSecondaryButton)
        setupDoneButton = findViewById(R.id.setupDoneButton)

        // Same wordmark as the website and the iOS app: "Anyloc" + pink ".io".
        findViewById<TextView>(R.id.wordmark).text = SpannableString("Anyloc.io").apply {
            setSpan(
                ForegroundColorSpan(ContextCompat.getColor(this@MainActivity, R.color.dark_accent)),
                6, 9, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE,
            )
        }

        // Rounded app icon, like on the iOS home screen.
        findViewById<View>(R.id.setupLogo).clipToOutline = true

        applyWindowInsets()
        setupMap(savedInstanceState)

        findViewById<View>(R.id.settingsButton).setOnClickListener { showSettings(true) }
        findViewById<View>(R.id.closeSettingsButton).setOnClickListener { showSettings(false) }

        setupPrimaryButton.setOnClickListener { handleSetupPrimary() }
        setupSecondaryButton.setOnClickListener { handleSetupSecondary() }
        setupDoneButton.setOnClickListener { refreshSetupUi(startIfReady = true) }

        val prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        apiBaseUrlInput.setText(
            ApiBaseUrl.sanitize(prefs.getString(KEY_API_BASE_URL, "https://www.anyloc.io"))
        )
        tokenInput.setText(prefs.getString(KEY_DEVICE_TOKEN, ""))

        findViewById<View>(R.id.testButton).setOnClickListener { testConnection() }
        findViewById<View>(R.id.journalButton).setOnClickListener { sendJournal() }
        findViewById<View>(R.id.logoutButton).setOnClickListener { confirmLogout() }
        findViewById<TextView>(R.id.profileVersion).text = appVersion()
        findViewById<TextView>(R.id.profileDevice).text = deviceName()
        findViewById<com.google.android.material.switchmaterial.SwitchMaterial>(R.id.filmingSwitch).apply {
            isChecked = prefs.getBoolean(KEY_FILMING_MODE, false)
            setOnCheckedChangeListener { _, on -> prefs.edit().putBoolean(KEY_FILMING_MODE, on).apply() }
        }

        tabTeleport.setOnClickListener { setExploring(false) }
        tabExplore.setOnClickListener { setExploring(true) }
        renderTabs()
        renderSpotCategories()
        renderSpots()

        teleportButton.setOnClickListener { selected?.let { activateLocation(it) } }
        pauseButton.setOnClickListener { pauseLocation() }
        findViewById<View>(R.id.stopButton).setOnClickListener { pauseLocation() }
        recenterButton.setOnClickListener { selected?.let { focus(it.lat, it.lng) } }

        clearSearchButton.setOnClickListener { clearSearch() }
        searchInput.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_SEARCH) {
                val query = searchInput.text.toString().trim()
                if (query.length >= 2) performSearch(query)
                true
            } else {
                false
            }
        }
        searchInput.addTextChangedListener(object : android.text.TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = Unit
            override fun afterTextChanged(s: android.text.Editable?) {
                val query = s?.toString()?.trim().orEmpty()
                clearSearchButton.visibility = if (query.isEmpty()) View.GONE else View.VISIBLE
                scheduleSearch(query)
            }
        })

        renderPanel()
        handleDeepLink(intent)
        requestRuntimePermissionsIfNeeded()
        refreshCurrentLocation()
        refreshSetupUi(startIfReady = true)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleDeepLink(intent)
    }

    override fun onStart() {
        super.onStart()
        mapView.onStart()
    }

    override fun onResume() {
        super.onResume()
        mapView.onResume()
        refreshCurrentLocation()
        refreshSetupUi(startIfReady = true)
    }

    override fun onPause() {
        mapView.onPause()
        super.onPause()
    }

    override fun onStop() {
        mapView.onStop()
        super.onStop()
    }

    override fun onLowMemory() {
        super.onLowMemory()
        mapView.onLowMemory()
    }

    override fun onDestroy() {
        mapView.onDestroy()
        super.onDestroy()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        mapView.onSaveInstanceState(outState)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (settingsOverlay.visibility == View.VISIBLE && readCredentials() != null) {
            showSettings(false)
            return
        }
        @Suppress("DEPRECATION")
        super.onBackPressed()
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray,
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)

        if (requestCode != RUNTIME_PERMISSIONS_REQUEST) {
            return
        }

        if (hasRequiredRuntimePermissions()) {
            if (pendingSpoofingStart) {
                pendingSpoofingStart = false
                ensureSpoofingRunningIfReady()
            }
            return
        }

        pendingSpoofingStart = false
        setStatus("Autorise la localisation et les notifications pour utiliser Anyloc", isError = true)
        Toast.makeText(
            this,
            "Anyloc a besoin de la localisation pour fonctionner",
            Toast.LENGTH_LONG,
        ).show()
    }

    // MARK: - Layout

    private fun applyWindowInsets() {
        val topPadding = topColumn.paddingTop
        val settingsHeader = findViewById<View>(R.id.settingsHeader)
        val settingsContent = findViewById<View>(R.id.settingsContent)
        val settingsTop = settingsHeader.paddingTop
        val settingsBottom = settingsContent.paddingBottom
        val setupPadding = setupOverlay.paddingTop
        val sheetMargin = (sheet.layoutParams as android.widget.FrameLayout.LayoutParams).bottomMargin

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.root)) { _, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
            topColumn.updatePadding(top = topPadding + bars.top)
            settingsHeader.updatePadding(top = settingsTop + bars.top)
            settingsContent.updatePadding(bottom = settingsBottom + maxOf(bars.bottom, ime.bottom))
            setupOverlay.updatePadding(top = setupPadding + bars.top, bottom = setupPadding + bars.bottom)
            // The keyboard slides over the panel, like on iOS: only the nav bar pushes it up.
            sheet.layoutParams = (sheet.layoutParams as android.widget.FrameLayout.LayoutParams).apply {
                bottomMargin = sheetMargin + bars.bottom
            }
            insets
        }
    }

    private fun showSettings(visible: Boolean) {
        settingsOverlay.visibility = if (visible) View.VISIBLE else View.GONE
        // The profile page is light, like on iOS: dark status bar icons there.
        WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightStatusBars = visible
        hideKeyboard()
        if (visible) loadProfile()
    }

    private fun hideKeyboard() {
        val imm = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
        imm.hideSoftInputFromWindow(window.decorView.windowToken, 0)
        searchInput.clearFocus()
    }

    private fun dp(value: Float): Int =
        TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value, resources.displayMetrics).toInt()

    // MARK: - Map

    private fun setupMap(savedInstanceState: Bundle?) {
        mapView.onCreate(savedInstanceState)
        mapView.getMapAsync { m ->
            map = m
            m.uiSettings.isLogoEnabled = false
            m.uiSettings.isCompassEnabled = false
            m.uiSettings.isRotateGesturesEnabled = false
            m.uiSettings.isTiltGesturesEnabled = false
            m.uiSettings.setAttributionTintColor(ContextCompat.getColor(this, R.color.dark_dim))
            m.cameraPosition = CameraPosition.Builder()
                .target(LatLng(46.6, 2.4))
                .zoom(4.2)
                .build()

            // Same basemap as the web remote.
            m.setStyle(Style.Builder().fromUri(MAP_STYLE_URL)) { style ->
                BitmapUtils.getBitmapFromDrawable(ContextCompat.getDrawable(this, R.drawable.map_pin))
                    ?.let { style.addImage(PIN_IMAGE, it) }
                val source = GeoJsonSource(PIN_SOURCE)
                style.addSource(source)
                style.addLayer(
                    SymbolLayer(PIN_LAYER, PIN_SOURCE).withProperties(
                        PropertyFactory.iconImage(PIN_IMAGE),
                        PropertyFactory.iconAnchor(Property.ICON_ANCHOR_BOTTOM),
                        PropertyFactory.iconAllowOverlap(true),
                        PropertyFactory.iconIgnorePlacement(true),
                    )
                )
                pinSource = source
                updatePin()
            }

            m.addOnMapClickListener { point ->
                hideKeyboard()
                clearSearch()
                if (!isApplying) {
                    select(SelectedPlace(formatCoords(point.latitude, point.longitude), point.latitude, point.longitude), moveCamera = false)
                }
                true
            }

            // Keep the attribution readable, just above the bottom panel.
            sheet.post { m.uiSettings.setAttributionMargins(dp(16f), 0, 0, mapView.height - sheet.top + dp(6f)) }
            selected?.let { focus(it.lat, it.lng) }
        }
    }

    private fun updatePin() {
        val place = selected
        if (place == null) {
            pinSource?.setGeoJson(FeatureCollection.fromFeatures(emptyList()))
        } else {
            pinSource?.setGeoJson(Point.fromLngLat(place.lng, place.lat))
        }
    }

    /** Centres [lat]/[lng] in the part of the map not covered by the floating UI. */
    private fun focus(lat: Double, lng: Double, zoom: Double? = null) {
        val m = map ?: return
        val top = (topColumn.bottom).toDouble()
        val bottom = (mapView.height - sheet.top).coerceAtLeast(0).toDouble()
        val position = CameraPosition.Builder()
            .target(LatLng(lat, lng))
            .zoom(zoom ?: maxOf(m.cameraPosition.zoom, 12.0))
            .padding(0.0, top, 0.0, bottom)
            .build()
        m.animateCamera(CameraUpdateFactory.newCameraPosition(position), 900)
    }

    // MARK: - Panel

    private fun select(place: SelectedPlace, moveCamera: Boolean = true) {
        selected = place
        updatePin()
        renderPanel()
        if (moveCamera) focus(place.lat, place.lng, zoom = 13.0)
    }

    private val isSelectedActive: Boolean
        get() {
            val active = activeLocation ?: return false
            val place = selected ?: return false
            return active.isActive && abs(active.lat - place.lat) < 1e-5 && abs(active.lng - place.lng) < 1e-5
        }

    private fun renderPanel() {
        val place = selected
        if (place == null) {
            captionText.text = "PRÊT"
            placeNameText.text = "Touche la carte ou cherche un lieu"
            placeNameText.setTextColor(ContextCompat.getColor(this, R.color.dark_text_soft))
            placeNameText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 17f)
            placeNameText.typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
            coordsText.visibility = View.GONE
            recenterButton.visibility = View.GONE
        } else {
            captionText.text = if (isSelectedActive) "POSITION ACTIVE" else "PRÊT"
            placeNameText.text = place.name
            placeNameText.setTextColor(ContextCompat.getColor(this, R.color.dark_text))
            placeNameText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
            placeNameText.typeface = Typeface.create("sans-serif-medium", Typeface.BOLD)
            coordsText.text = formatCoords(place.lat, place.lng)
            // A map tap is named by its coordinates: don't print them twice.
            coordsText.visibility = if (place.name == coordsText.text) View.GONE else View.VISIBLE
            recenterButton.visibility = View.VISIBLE
        }

        if (isSelectedActive) {
            teleportButton.visibility = View.GONE
            pauseButton.visibility = View.GONE
            if (activeBar.visibility != View.VISIBLE) {
                activeTimer.base = SystemClock.elapsedRealtime() - activeElapsedMs()
                activeTimer.start()
            }
            activeBar.visibility = View.VISIBLE
        } else {
            activeTimer.stop()
            activeBar.visibility = View.GONE
            teleportButton.visibility = View.VISIBLE
            val enabled = place != null && !isApplying
            teleportButton.isEnabled = enabled
            teleportButton.alpha = if (place == null) 0.45f else 1f
            teleportProgress.visibility = if (isApplying) View.VISIBLE else View.GONE
            teleportIcon.visibility = if (isApplying) View.GONE else View.VISIBLE
            pauseButton.visibility = if (activeLocation?.isActive == true) View.VISIBLE else View.GONE
        }
    }

    private fun setStatus(text: String?, isError: Boolean = false) {
        settingsStatusText.text = text.orEmpty()
        if (text.isNullOrBlank()) {
            statusText.visibility = View.GONE
            return
        }
        statusText.text = text
        statusText.setTextColor(ContextCompat.getColor(this, if (isError) R.color.error else R.color.dark_accent))
        statusText.visibility = View.VISIBLE
    }

    private fun activeElapsedMs(): Long {
        val since = getSharedPreferences(PREFS_NAME, MODE_PRIVATE).getLong(KEY_ACTIVE_SINCE, 0L)
        return if (since > 0) (System.currentTimeMillis() - since).coerceAtLeast(0) else 0L
    }

    private fun formatCoords(lat: Double, lng: Double): String =
        "%.5f, %.5f".format(java.util.Locale.US, lat, lng)

    // MARK: - Setup

    private fun handleDeepLink(intent: Intent?) {
        val data = intent?.data ?: return
        if (data.scheme != "anyloc") {
            return
        }

        val token = data.getQueryParameter("token")?.trim().orEmpty()
        if (token.isEmpty()) {
            return
        }

        val api = ApiBaseUrl.sanitize(data.getQueryParameter("api"))

        apiBaseUrlInput.setText(api)
        tokenInput.setText(token)
        persistCredentials(api, token)
        refreshSetupUi(startIfReady = true)
        setStatus("Configuré depuis le lien ✓")
        Toast.makeText(this, "Anyloc configuré automatiquement", Toast.LENGTH_SHORT).show()
    }

    private fun refreshSetupUi(startIfReady: Boolean) {
        val hasToken = readCredentials() != null
        val mockAllowed = MockLocationHelper.isMockLocationAllowed(this)

        if (!hasToken) {
            showSetupOverlay(
                title = "Lie l'app à ton compte",
                body = "Sur anyloc.io, appuie sur « Ouvrir Anyloc sur mon tel ». Sinon, colle le code dans les réglages.",
                primary = "Ouvrir anyloc.io",
                secondary = "Coller le code",
                done = "C'est fait, vérifier",
            )
            return
        }

        if (!mockAllowed) {
            showSetupOverlay(
                title = "Encore 1 étape",
                body = "Tape 7 fois sur Numéro de build, puis choisis Anyloc comme application de localisation fictive. Les boutons ouvrent les bons menus.",
                primary = "Ouvrir les options développeur",
                secondary = "Ouvrir À propos du téléphone",
                done = "C'est fait, vérifier",
            )
            setStatus("Choisis Anyloc dans Options développeur → Application de localisation fictive")
            setupHintShown = true
            return
        }

        hideSetupOverlay()

        if (startIfReady) {
            ensureSpoofingRunningIfReady()
        }
    }

    private fun showSetupOverlay(
        title: String,
        body: String,
        primary: String,
        secondary: String,
        done: String,
    ) {
        setupTitle.text = title
        setupBody.text = body
        setupPrimaryButton.text = primary
        setupSecondaryButton.text = secondary
        setupDoneButton.text = done
        setupOverlay.visibility = View.VISIBLE
    }

    private fun hideSetupOverlay() {
        setupOverlay.visibility = View.GONE
    }

    private fun handleSetupPrimary() {
        if (readCredentials() == null) {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://anyloc.io/dashboard")))
            return
        }

        openSettings(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS)
    }

    private fun handleSetupSecondary() {
        if (readCredentials() == null) {
            hideSetupOverlay()
            showSettings(true)
            tokenInput.requestFocus()
            return
        }

        openSettings(Settings.ACTION_DEVICE_INFO_SETTINGS)
    }

    private fun openSettings(action: String) {
        val intents = listOf(
            Intent(action),
            Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS),
            Intent(Settings.ACTION_DEVICE_INFO_SETTINGS),
            Intent(Settings.ACTION_SETTINGS),
        )

        for (intent in intents) {
            try {
                startActivity(intent)
                return
            } catch (_: Exception) {
                // Try the next fallback.
            }
        }

        Toast.makeText(this, "Ouvre Paramètres → Options pour les développeurs", Toast.LENGTH_LONG).show()
    }

    private fun ensureSpoofingRunningIfReady() {
        val credentials = readCredentials() ?: return

        if (!MockLocationHelper.isMockLocationAllowed(this)) {
            refreshSetupUi(startIfReady = false)
            return
        }

        if (!hasRequiredRuntimePermissions()) {
            pendingSpoofingStart = true
            requestRuntimePermissionsIfNeeded()
            setStatus("Autorise la localisation pour continuer")
            setupHintShown = true
            return
        }

        updateSpoofingStatus(credentials, showSuccessToast = false)
    }

    private fun updateSpoofingStatus(
        credentials: Pair<String, String>,
        showSuccessToast: Boolean,
    ) {
        if (!MockLocationHelper.isMockLocationAllowed(this)) {
            refreshSetupUi(startIfReady = false)
            return
        }

        persistCredentials(credentials.first, credentials.second)
        val started = MockLocationService.start(this, credentials.first, credentials.second)
        if (started) {
            // Setup is done: drop the setup hint, the panel already says what to do next.
            if (setupHintShown) setStatus(null)
            setupHintShown = false
        } else {
            setStatus("Impossible de démarrer le GPS — réessaie dans quelques secondes", isError = true)
        }

        if (started && showSuccessToast) {
            Toast.makeText(this, "GPS prêt — cherche ta ville en haut", Toast.LENGTH_SHORT).show()
        }
    }

    // MARK: - Search

    private fun clearSearch() {
        searchRunnable?.let { mainHandler.removeCallbacks(it) }
        if (searchInput.text.isNotEmpty()) searchInput.setText("")
        searchResultsContainer.visibility = View.GONE
        searchResultsContainer.removeAllViews()
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
            val results = runCatching { api.searchPlaces(query) }.getOrDefault(emptyList())

            runOnUiThread {
                // Drop late answers for a query the user has already changed.
                if (searchInput.text.toString().trim() == query) renderSearchResults(results)
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

        results.take(6).forEachIndexed { index, result ->
            if (index > 0) {
                searchResultsContainer.addView(View(this).apply {
                    setBackgroundColor(ContextCompat.getColor(this@MainActivity, R.color.dark_line))
                    layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(1f)).apply {
                        marginStart = dp(44f)
                    }
                })
            }
            searchResultsContainer.addView(searchRow(result))
        }
    }

    private fun searchRow(result: GeocodeResult): View {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            minimumHeight = dp(48f)
            setPadding(dp(16f), dp(8f), dp(16f), dp(8f))
            setBackgroundResource(R.drawable.bg_row)
            setOnClickListener { pick(result) }
        }
        row.addView(ImageView(this).apply {
            setImageResource(R.drawable.ic_place)
            setColorFilter(ContextCompat.getColor(this@MainActivity, R.color.dark_accent))
            layoutParams = LinearLayout.LayoutParams(dp(18f), dp(18f))
        })
        val texts = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
                marginStart = dp(12f)
            }
        }
        texts.addView(TextView(this).apply {
            text = result.name
            maxLines = 1
            ellipsize = android.text.TextUtils.TruncateAt.END
            setTextColor(ContextCompat.getColor(this@MainActivity, R.color.dark_text_soft))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
        })
        if (result.subtitle.isNotBlank()) {
            texts.addView(TextView(this).apply {
                text = result.subtitle
                maxLines = 1
                ellipsize = android.text.TextUtils.TruncateAt.END
                setTextColor(ContextCompat.getColor(this@MainActivity, R.color.dark_muted))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 12.5f)
            })
        }
        row.addView(texts)
        return row
    }

    private fun pick(result: GeocodeResult) {
        hideKeyboard()
        clearSearch()
        select(SelectedPlace(result.name, result.lat, result.lng))
    }

    // MARK: - Location

    private fun activateLocation(place: SelectedPlace) {
        val credentials = readCredentials()

        if (credentials == null) {
            Toast.makeText(this, "Configure d'abord ton code dans les réglages", Toast.LENGTH_SHORT).show()
            showSettings(true)
            return
        }

        if (!hasRequiredRuntimePermissions()) {
            pendingSpoofingStart = true
            requestRuntimePermissionsIfNeeded()
            Toast.makeText(this, "Autorise la localisation pour activer le GPS", Toast.LENGTH_SHORT).show()
            return
        }

        isApplying = true
        setStatus(null)
        renderPanel()

        // Filming mode: the branded card covers the wait, at least ~4 s so it reads on camera.
        val filming = getSharedPreferences(PREFS_NAME, MODE_PRIVATE).getBoolean(KEY_FILMING_MODE, false)
        val startedAt = SystemClock.elapsedRealtime()
        if (filming) {
            hideKeyboard()
            showcase.show(place.name)
            mainHandler.postDelayed({ if (isApplying) showcase.setStep(TeleportShowcase.Step.SENDING) }, 2200)
        }

        Thread {
            val api = AnylocApi(credentials.first, credentials.second)
            // Network errors must not kill the app: show the failure instead.
            val location = runCatching {
                api.updateLocation(place.name, place.lat, place.lng, isActive = true)
            }.onFailure { error ->
                AppErrorReporter.report(this, credentials.first, credentials.second, "location/activate", error)
            }.getOrNull()
            // Fetched here, not on the UI thread: Android kills the app on main-thread network calls.
            val check = if (location == null) runCatching { api.fetchLocation() }.getOrNull() else null

            val showcaseWait = if (filming) (4200 - (SystemClock.elapsedRealtime() - startedAt)).coerceAtLeast(0) else 0
            mainHandler.postDelayed({
                isApplying = false
                if (location == null) {
                    if (filming) showcase.hide()
                    renderPanel()
                    if (check?.subscriptionInactive == true) {
                        showSubscriptionInactive(
                            check.inactiveDetails
                                ?: SubscriptionInactiveDetails.fallback(credentials.first)
                        )
                        return@postDelayed
                    }

                    setStatus("Impossible d'activer cette position", isError = true)
                    return@postDelayed
                }

                getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit()
                    .putLong(KEY_ACTIVE_SINCE, System.currentTimeMillis())
                    .apply()
                activeLocation = location
                // Keep the pin exactly where the user put it, with the server's name.
                selected = SelectedPlace(location.name, location.lat, location.lng)
                updatePin()
                renderPanel()
                MockLocationService.start(this, credentials.first, credentials.second)
                setStatus(null)
                if (filming) {
                    // The card says "Tu es à …": no toast on camera.
                    showcase.setStep(TeleportShowcase.Step.DONE)
                    mainHandler.postDelayed({
                        showcase.hide()
                        focus(location.lat, location.lng, zoom = 14.0)
                    }, 1600)
                } else {
                    Toast.makeText(this, "GPS activé sur ${location.name}", Toast.LENGTH_SHORT).show()
                }
            }, showcaseWait)
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
            val location = runCatching {
                api.updateLocation(current.name, current.lat, current.lng, isActive = false)
            }.getOrNull()

            runOnUiThread {
                if (location != null) {
                    activeLocation = location
                    renderPanel()
                    setStatus("Tu es revenu à ta vraie position")
                } else {
                    setStatus("Pas de connexion — réessaie", isError = true)
                }
            }
        }.start()
    }

    private fun showSubscriptionInactive(details: SubscriptionInactiveDetails) {
        MockLocationService.stop(this)
        startActivity(SubscriptionInactiveActivity.createIntent(this, details))
    }

    private fun refreshCurrentLocation() {
        val credentials = readCredentials() ?: return

        Thread {
            val api = AnylocApi(credentials.first, credentials.second)
            val result = runCatching { api.fetchLocation() }.getOrNull() ?: return@Thread

            runOnUiThread {
                val location = result.location
                if (result.subscriptionInactive) {
                    showSubscriptionInactive(
                        result.inactiveDetails
                            ?: SubscriptionInactiveDetails.fallback(credentials.first)
                    )
                    return@runOnUiThread
                }

                if (location != null) {
                    activeLocation = location
                    // Open on the active place, like iOS; leave a fresh pick alone.
                    if (location.isActive && selected == null) {
                        select(SelectedPlace(location.name, location.lat, location.lng))
                    }
                    renderPanel()
                }
            }
        }.start()
    }

    // MARK: - Explorer

    private fun setExploring(on: Boolean) {
        if (exploring == on) return
        exploring = on
        hideKeyboard()
        clearSearch()
        renderTabs()
    }

    private fun renderTabs() {
        teleportPanel.visibility = if (exploring) View.GONE else View.VISIBLE
        explorePanel.visibility = if (exploring) View.VISIBLE else View.GONE
        styleTab(tabTeleport, R.id.tabTeleportIcon, R.id.tabTeleportText, !exploring)
        styleTab(tabExplore, R.id.tabExploreIcon, R.id.tabExploreText, exploring)
    }

    private fun styleTab(tab: View, iconId: Int, textId: Int, on: Boolean) {
        val color = ContextCompat.getColor(this, if (on) R.color.dark_accent else R.color.dark_text_soft)
        tab.setBackgroundResource(if (on) R.drawable.bg_segment_on else 0)
        tab.findViewById<ImageView>(iconId).imageTintList = ColorStateList.valueOf(color)
        tab.findViewById<TextView>(textId).setTextColor(color)
    }

    private fun renderSpotCategories() {
        spotCategoriesContainer.removeAllViews()
        spotCategories.forEach { category ->
            val on = category.id == spotCategory
            spotCategoriesContainer.addView(TextView(this).apply {
                text = category.label
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
                typeface = Typeface.DEFAULT_BOLD
                setTextColor(ContextCompat.getColor(this@MainActivity, if (on) R.color.dark_accent else R.color.dark_text_soft))
                setBackgroundResource(if (on) R.drawable.bg_chip_on else R.drawable.bg_chip)
                setPadding(dp(14f), dp(7f), dp(14f), dp(7f))
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                ).apply { marginEnd = dp(8f) }
                setOnClickListener {
                    spotCategory = category.id
                    renderSpotCategories()
                    renderSpots()
                }
            })
        }
    }

    private fun renderSpots() {
        spotsContainer.removeAllViews()
        allSpots.filter { spotCategory == "all" || it.category == spotCategory }.forEach { spot ->
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(0, dp(6f), 0, dp(6f))
                setBackgroundResource(R.drawable.bg_row)
                setOnClickListener { pickSpot(spot) }
            }
            row.addView(TextView(this).apply {
                text = spot.emoji
                gravity = Gravity.CENTER
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 22f)
                setBackgroundResource(R.drawable.bg_spot_emoji)
                layoutParams = LinearLayout.LayoutParams(dp(44f), dp(44f))
            })
            val texts = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
                    marginStart = dp(12f)
                    marginEnd = dp(8f)
                }
            }
            texts.addView(TextView(this).apply {
                text = spot.name
                maxLines = 1
                ellipsize = android.text.TextUtils.TruncateAt.END
                typeface = Typeface.DEFAULT_BOLD
                setTextColor(ContextCompat.getColor(this@MainActivity, R.color.dark_text))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
            })
            texts.addView(TextView(this).apply {
                text = spot.country
                maxLines = 1
                setTextColor(ContextCompat.getColor(this@MainActivity, R.color.dark_muted))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 12.5f)
            })
            row.addView(texts)
            row.addView(ImageView(this).apply {
                setImageResource(R.drawable.ic_chevron_right)
                setColorFilter(ContextCompat.getColor(this@MainActivity, R.color.dark_dim))
                layoutParams = LinearLayout.LayoutParams(dp(18f), dp(18f))
            })
            spotsContainer.addView(row)
        }
    }

    private fun pickSpot(spot: Spot) {
        setExploring(false)
        select(SelectedPlace(spot.name, spot.lat, spot.lng))
    }

    // MARK: - Profile

    private fun loadProfile() {
        val credentials = readCredentials() ?: return

        Thread {
            val profile = runCatching { AnylocApi(credentials.first, credentials.second).fetchProfile() }.getOrNull()
            runOnUiThread { if (profile != null) renderProfile(profile) }
        }.start()
    }

    private fun renderProfile(profile: DeviceProfile) {
        profileEmail.text = profile.email ?: "—"
        profileRole.text = if (profile.planId == "admin") "Admin" else "Utilisateur"
        val name = when (profile.planId) {
            "monthly" -> "Mensuel"
            "6months" -> "6 mois"
            "annual" -> "Annuel"
            "admin" -> "Admin"
            "clipper" -> "Clippeur"
            null -> "Aucun abonnement"
            else -> "Actif"
        }
        planName.text = if (profile.isTrial) "$name (essai)" else name
        renderPlanCards(visible = profile.planId == null || profile.isTrial)
    }

    /** Upgrade offers, same prices and copy as the iOS profile page. */
    private fun renderPlanCards(visible: Boolean) {
        planCards.removeAllViews()
        planCards.visibility = if (visible) View.VISIBLE else View.GONE
        if (!visible) return

        planCards.addView(View(this).apply {
            setBackgroundColor(ContextCompat.getColor(this@MainActivity, R.color.light_border))
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(1f))
        })
        listOf(
            PlanOffer("Mensuel", "0,33€", "9,90€/mois", "Commencer maintenant", listOf("Changements illimités", "iOS + Android", "Support mail"), false),
            PlanOffer("6 mois", "≈ 0,19€", "34,90€/6 mois", "Économiser 40%", listOf("Tout le Mensuel", "Trajets simulés", "Support mail"), false),
            PlanOffer("Annuel", "≈ 0,13€", "49,00€/an", "Débloquer le meilleur prix", listOf("App iPhone sans ordi", "Support prioritaire", "3 profils web"), true),
        ).forEachIndexed { index, offer ->
            planCards.addView(planCard(offer).apply {
                layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
                    setMargins(dp(12f), if (index == 0) dp(12f) else dp(8f), dp(12f), if (index == 2) dp(12f) else 0)
                }
            })
        }
    }

    private data class PlanOffer(
        val name: String,
        val perDay: String,
        val billed: String,
        val cta: String,
        val features: List<String>,
        val popular: Boolean,
    )

    private fun planCard(offer: PlanOffer): View {
        val color = { id: Int -> ContextCompat.getColor(this, id) }
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(12f), dp(12f), dp(12f), dp(12f))
            setBackgroundResource(if (offer.popular) R.drawable.bg_plan_popular else R.drawable.bg_plan)
        }
        val top = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        val left = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }
        val title = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        title.addView(TextView(this).apply {
            text = offer.name
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(color(R.color.light_text))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
        })
        if (offer.popular) {
            title.addView(TextView(this).apply {
                text = "POPULAIRE"
                typeface = Typeface.DEFAULT_BOLD
                setTextColor(color(android.R.color.white))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 9f)
                setBackgroundResource(R.drawable.bg_pill_gradient)
                setPadding(dp(6f), dp(2f), dp(6f), dp(2f))
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                ).apply { marginStart = dp(6f) }
            })
        }
        left.addView(title)
        left.addView(TextView(this).apply {
            text = SpannableString("${offer.perDay}/jour").apply {
                setSpan(ForegroundColorSpan(color(R.color.light_dim)), offer.perDay.length, length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                setSpan(android.text.style.RelativeSizeSpan(0.55f), offer.perDay.length, length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
            }
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(color(R.color.accent_start))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 22f)
        })
        left.addView(TextView(this).apply {
            text = offer.billed
            setTextColor(color(R.color.light_dim))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
        })
        top.addView(left)
        top.addView(TextView(this).apply {
            text = offer.cta
            gravity = Gravity.CENTER
            maxWidth = dp(120f)
            maxLines = 2
            typeface = Typeface.DEFAULT_BOLD
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
            setTextColor(color(if (offer.popular) android.R.color.white else R.color.light_text))
            setBackgroundResource(if (offer.popular) R.drawable.bg_pill_gradient else R.drawable.bg_pill_light)
            setPadding(dp(10f), dp(7f), dp(10f), dp(7f))
            setOnClickListener { openPricing() }
        })
        card.addView(top)
        val features = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, dp(8f), 0, 0)
        }
        offer.features.forEach { feature ->
            features.addView(TextView(this).apply {
                text = "✓ $feature"
                maxLines = 1
                setTextColor(color(R.color.light_dim))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 10f)
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                ).apply { marginEnd = dp(10f) }
            })
        }
        card.addView(features)
        return card
    }

    private fun openPricing() {
        val base = readCredentials()?.first ?: "https://www.anyloc.io"
        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("${base.trimEnd('/')}/pricing")))
    }

    /** Shares a support journal: app state plus this app's recent logs. */
    private fun sendJournal() {
        val credentials = readCredentials()
        val active = activeLocation
        Thread {
            val logs = runCatching {
                val process = Runtime.getRuntime().exec(
                    arrayOf("logcat", "-d", "-t", "400", "--pid=${android.os.Process.myPid()}")
                )
                process.inputStream.bufferedReader().use { it.readText() }
            }.getOrDefault("(journal indisponible)")
            val journal = buildString {
                appendLine("Anyloc Android ${appVersion()} — Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})")
                appendLine("Appareil : ${deviceName()}")
                appendLine("Lié : ${if (credentials != null) "oui" else "non"} · API ${credentials?.first ?: "—"}")
                appendLine("Localisation fictive autorisée : ${if (MockLocationHelper.isMockLocationAllowed(this@MainActivity)) "oui" else "non"}")
                appendLine("Permissions : ${if (hasRequiredRuntimePermissions()) "ok" else "manquantes"}")
                appendLine("Position : ${active?.let { if (it.isActive) "active" else "en pause" } ?: "aucune"}")
                appendLine("Exporté le ${java.time.OffsetDateTime.now()}")
                appendLine()
                append(logs.ifBlank { "(journal vide)" })
            }
            runOnUiThread {
                val send = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_EMAIL, arrayOf("support@anyloc.io"))
                    putExtra(Intent.EXTRA_SUBJECT, "Journal Anyloc Android")
                    putExtra(Intent.EXTRA_TEXT, journal)
                }
                startActivity(Intent.createChooser(send, "Envoyer le journal au support"))
            }
        }.start()
    }

    private fun confirmLogout() {
        com.google.android.material.dialog.MaterialAlertDialogBuilder(this)
            .setTitle("Déconnexion")
            .setMessage("L'app sera déliée de ton compte. Tu pourras la relier depuis anyloc.io.")
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Se déconnecter") { _, _ -> logout() }
            .show()
    }

    private fun logout() {
        MockLocationService.stop(this)
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit()
            .remove(KEY_DEVICE_TOKEN)
            .remove(KEY_ACTIVE_SINCE)
            .apply()
        tokenInput.setText("")
        activeLocation = null
        selected = null
        updatePin()
        renderPanel()
        setStatus(null)
        profileEmail.text = "—"
        planName.text = "—"
        renderPlanCards(visible = false)
        showSettings(false)
        refreshSetupUi(startIfReady = false)
    }

    private fun appVersion(): String = runCatching {
        val info = packageManager.getPackageInfo(packageName, 0)
        "${info.versionName} (${info.longVersionCode})"
    }.getOrDefault("?")

    private fun deviceName(): String {
        val maker = Build.MANUFACTURER.replaceFirstChar { it.uppercase() }
        return if (Build.MODEL.startsWith(Build.MANUFACTURER, ignoreCase = true)) Build.MODEL else "$maker ${Build.MODEL}"
    }

    // MARK: - Credentials & permissions

    private fun readCredentials(): Pair<String, String>? {
        val apiBaseUrl = ApiBaseUrl.sanitize(apiBaseUrlInput.text.toString())
        val token = tokenInput.text.toString().trim()

        if (token.isEmpty()) {
            return null
        }

        return apiBaseUrl to token
    }

    private fun persistCredentials(apiBaseUrl: String, token: String) {
        val safeApiBaseUrl = ApiBaseUrl.sanitize(apiBaseUrl)

        getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .edit()
            .putString(KEY_API_BASE_URL, safeApiBaseUrl)
            .putString(KEY_DEVICE_TOKEN, token)
            .apply()
    }

    private fun requiredRuntimePermissions(): Array<String> {
        val permissions = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        return permissions.toTypedArray()
    }

    private fun hasRequiredRuntimePermissions(): Boolean {
        return requiredRuntimePermissions().all { permission ->
            ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED
        }
    }

    private fun requestRuntimePermissionsIfNeeded() {
        val missingPermissions = requiredRuntimePermissions().filter { permission ->
            ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED
        }

        if (missingPermissions.isEmpty()) {
            return
        }

        ActivityCompat.requestPermissions(
            this,
            missingPermissions.toTypedArray(),
            RUNTIME_PERMISSIONS_REQUEST,
        )
    }

    private fun testConnection() {
        val credentials = readCredentials()

        if (credentials == null) {
            Toast.makeText(this, "Renseigne le code de liaison", Toast.LENGTH_SHORT).show()
            return
        }

        persistCredentials(credentials.first, credentials.second)
        hideKeyboard()

        Thread {
            val api = AnylocApi(credentials.first, credentials.second)
            val result = runCatching { api.fetchLocation() }.getOrNull()

            runOnUiThread {
                if (result == null) {
                    setStatus("Pas de connexion — réessaie", isError = true)
                    return@runOnUiThread
                }

                if (result.subscriptionInactive) {
                    showSubscriptionInactive(
                        result.inactiveDetails
                            ?: SubscriptionInactiveDetails.fallback(credentials.first)
                    )
                    return@runOnUiThread
                }

                val location = result.location
                if (location == null) {
                    setStatus("Échec de connexion — vérifie le code et l'abonnement", isError = true)
                    return@runOnUiThread
                }

                activeLocation = location
                renderPanel()
                setStatus(if (location.isActive) "Connecté · ${location.name}" else "Connecté ✓")
                refreshSetupUi(startIfReady = true)
            }
        }.start()
    }

    companion object {
        private const val PREFS_NAME = "anyloc_prefs"
        private const val KEY_API_BASE_URL = "api_base_url"
        private const val KEY_DEVICE_TOKEN = "device_token"
        private const val KEY_ACTIVE_SINCE = "active_since"
        private const val KEY_FILMING_MODE = "filming_mode"
        private const val RUNTIME_PERMISSIONS_REQUEST = 42
        private const val MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/dark"
        private const val PIN_IMAGE = "anyloc-pin"
        private const val PIN_SOURCE = "anyloc-selected"
        private const val PIN_LAYER = "anyloc-selected-pin"
    }
}
