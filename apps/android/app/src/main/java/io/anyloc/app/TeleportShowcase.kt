package io.anyloc.app

import android.animation.ObjectAnimator
import android.animation.PropertyValuesHolder
import android.animation.ValueAnimator
import android.text.SpannableString
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import android.view.View
import android.view.animation.DecelerateInterpolator
import android.view.animation.OvershootInterpolator
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import androidx.core.content.ContextCompat

/**
 * Filming mode: the branded full-screen card shown during a teleport, so the
 * moment reads on camera (TeleportShowcaseView on iOS).
 */
class TeleportShowcase(private val root: View) {
    enum class Step { CONNECTING, SENDING, DONE }

    private val logoGroup = root.findViewById<View>(R.id.showcaseLogoGroup)
    private val logo = root.findViewById<ImageView>(R.id.showcaseLogo)
    private val wordmark = root.findViewById<TextView>(R.id.showcaseWordmark)
    private val status = root.findViewById<View>(R.id.showcaseStatus)
    private val progress = root.findViewById<ProgressBar>(R.id.showcaseProgress)
    private val check = root.findViewById<ImageView>(R.id.showcaseCheck)
    private val stepText = root.findViewById<TextView>(R.id.showcaseStepText)
    private val rings = listOf(R.id.showcaseRing1, R.id.showcaseRing2, R.id.showcaseRing3)
        .map { root.findViewById<View>(it) }
    private val loops = mutableListOf<ValueAnimator>()

    private var destination = ""

    init {
        wordmark.text = SpannableString("anyloc.io").apply {
            setSpan(
                ForegroundColorSpan(ContextCompat.getColor(root.context, R.color.dark_accent)),
                6, 9, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE,
            )
        }
    }

    val isShowing: Boolean
        get() = root.visibility == View.VISIBLE

    fun show(destination: String) {
        this.destination = destination
        setStep(Step.CONNECTING)
        root.alpha = 0f
        root.visibility = View.VISIBLE
        root.animate().alpha(1f).setDuration(500).start()

        // Staged entrance: logo, then the wordmark, then the status line.
        logoGroup.apply { alpha = 0f; scaleX = 0.5f; scaleY = 0.5f }
        logoGroup.animate().alpha(1f).scaleX(1f).scaleY(1f)
            .setStartDelay(250).setDuration(700).setInterpolator(OvershootInterpolator(1.2f)).start()
        wordmark.apply { alpha = 0f; translationY = dp(24f) }
        wordmark.animate().alpha(1f).translationY(0f)
            .setStartDelay(750).setDuration(600).setInterpolator(DecelerateInterpolator()).start()
        status.apply { alpha = 0f; translationY = dp(16f) }
        status.animate().alpha(1f).translationY(0f)
            .setStartDelay(1200).setDuration(500).setInterpolator(DecelerateInterpolator()).start()

        startPulse()
    }

    fun setStep(step: Step) {
        progress.visibility = if (step == Step.DONE) View.GONE else View.VISIBLE
        check.visibility = if (step == Step.DONE) View.VISIBLE else View.GONE
        stepText.text = when (step) {
            Step.CONNECTING -> "Connexion au téléphone…"
            Step.SENDING -> "Téléportation vers $destination…"
            Step.DONE -> "Tu es à $destination"
        }
    }

    fun hide() {
        root.animate().alpha(0f).setStartDelay(0).setDuration(700).withEndAction {
            root.visibility = View.GONE
            loops.forEach { it.cancel() }
            loops.clear()
        }.start()
    }

    private fun startPulse() {
        loops.forEach { it.cancel() }
        loops.clear()
        rings.forEachIndexed { i, ring ->
            ring.alpha = 0f
            loops += ObjectAnimator.ofPropertyValuesHolder(
                ring,
                PropertyValuesHolder.ofFloat(View.SCALE_X, 0.8f, 2.1f),
                PropertyValuesHolder.ofFloat(View.SCALE_Y, 0.8f, 2.1f),
                PropertyValuesHolder.ofFloat(View.ALPHA, 0.7f, 0f),
            ).apply {
                duration = 1800
                startDelay = i * 600L
                repeatCount = ValueAnimator.INFINITE
                interpolator = DecelerateInterpolator()
                start()
            }
        }
        loops += ObjectAnimator.ofPropertyValuesHolder(
            logo,
            PropertyValuesHolder.ofFloat(View.SCALE_X, 0.96f, 1.06f),
            PropertyValuesHolder.ofFloat(View.SCALE_Y, 0.96f, 1.06f),
        ).apply {
            duration = 900
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.REVERSE
            start()
        }
    }

    private fun dp(value: Float) = value * root.resources.displayMetrics.density
}
