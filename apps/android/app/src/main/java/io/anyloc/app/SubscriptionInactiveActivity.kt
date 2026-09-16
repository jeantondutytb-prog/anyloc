package io.anyloc.app

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.browser.customtabs.CustomTabsIntent
import com.google.android.material.button.MaterialButton
import io.anyloc.app.api.SubscriptionInactiveDetails
import io.anyloc.app.location.MockLocationService
import org.json.JSONObject

class SubscriptionInactiveActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_subscription_inactive)

        val details = readDetails(intent) ?: run {
            finish()
            return
        }

        MockLocationService.stop(this)

        val titleView = findViewById<TextView>(R.id.inactiveTitle)
        val descriptionView = findViewById<TextView>(R.id.inactiveDescription)
        val planView = findViewById<TextView>(R.id.inactivePlan)
        val supportView = findViewById<TextView>(R.id.inactiveSupport)
        val footerView = findViewById<TextView>(R.id.inactiveFooter)
        val iconView = findViewById<TextView>(R.id.inactiveIcon)
        val primaryButton = findViewById<MaterialButton>(R.id.primaryActionButton)
        val secondaryButton = findViewById<MaterialButton>(R.id.secondaryActionButton)

        titleView.text = details.title
        descriptionView.text = details.description
        primaryButton.text = details.ctaLabel

        iconView.text = when (details.reason) {
            "payment_failed" -> "€"
            "trial_cancelled", "trial_ended" -> "✦"
            else -> "!"
        }

        if (!details.previousPlanName.isNullOrBlank()) {
            planView.visibility = View.VISIBLE
            planView.text = getString(R.string.last_plan_label, details.previousPlanName)
        } else {
            planView.visibility = View.GONE
        }

        if (details.reason == "payment_failed") {
            supportView.visibility = View.VISIBLE
            supportView.text = getString(R.string.payment_support_hint, details.supportEmail)
        } else {
            supportView.visibility = View.GONE
        }

        footerView.text = getString(
            R.string.support_footer,
            getString(R.string.contact_support)
        )

        primaryButton.setOnClickListener {
            openUrl(details.checkoutUrl)
        }

        secondaryButton.setOnClickListener {
            openUrl(details.pricingUrl)
        }
    }

    private fun openUrl(url: String) {
        if (url.isBlank()) {
            return
        }

        val uri = Uri.parse(url)
        CustomTabsIntent.Builder().build().launchUrl(this, uri)
    }

    companion object {
        private const val EXTRA_DETAILS_JSON = "inactive_details_json"

        fun createIntent(
            context: Context,
            details: SubscriptionInactiveDetails,
        ): Intent {
            return Intent(context, SubscriptionInactiveActivity::class.java).apply {
                putExtra(EXTRA_DETAILS_JSON, details.toJson().toString())
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            }
        }

        fun readDetails(intent: Intent?): SubscriptionInactiveDetails? {
            val raw = intent?.getStringExtra(EXTRA_DETAILS_JSON) ?: return null

            return runCatching {
                SubscriptionInactiveDetails.fromJson(JSONObject(raw))
            }.getOrNull()
        }
    }
}
