package io.anyloc.app

/**
 * The "Encore 1 étape" screen: what to tap, in which order, named the way the
 * phone's brand names it. Plain Kotlin (no Android types) so it can be unit tested.
 *
 * Step 1, until developer options are on: open "À propos du téléphone" and tap
 * 7 times on the build entry. The developer options menu doesn't exist before
 * that, so it can't be the main button.
 * Step 2: in developer options, pick Anyloc as the mock location app.
 */
object SetupGuide {

    enum class Brand { SAMSUNG, XIAOMI, OTHER }

    enum class Target { ABOUT_PHONE, DEVELOPER_OPTIONS }

    data class Step(
        val title: String,
        val body: String,
        val primary: String,
        val primaryTarget: Target,
        val secondary: String,
        val secondaryTarget: Target,
        val status: String,
    )

    const val ABOUT_PHONE_BUTTON = "Ouvrir À propos du téléphone"
    const val DEVELOPER_OPTIONS_BUTTON = "Ouvrir les options développeur"

    /** Redmi and Poco phones are made by Xiaomi but may report their own name. */
    fun brandOf(manufacturer: String?): Brand {
        val maker = manufacturer.orEmpty().trim().lowercase()
        return when {
            maker.contains("samsung") -> Brand.SAMSUNG
            maker.contains("xiaomi") || maker.contains("redmi") || maker.contains("poco") -> Brand.XIAOMI
            else -> Brand.OTHER
        }
    }

    /** Where the entry to tap 7 times is, once "À propos du téléphone" is open. */
    fun buildNumberHint(brand: Brand): String = when (brand) {
        Brand.SAMSUNG -> "ouvre « Informations sur le logiciel », puis tape 7 fois sur « Numéro de version »"
        Brand.XIAOMI -> "tape 7 fois sur « Version MIUI » (ou « Version HyperOS »)"
        Brand.OTHER -> "tape 7 fois sur « Numéro de build »"
    }

    fun step(manufacturer: String?, developerOptionsEnabled: Boolean): Step {
        if (!developerOptionsEnabled) {
            return Step(
                title = "Encore 2 étapes",
                body = "1. Dans « À propos du téléphone », ${buildNumberHint(brandOf(manufacturer))}. " +
                    "Le téléphone peut demander ton code, puis dit que tu es développeur.\n" +
                    "2. Reviens dans Anyloc pour la dernière étape.",
                primary = ABOUT_PHONE_BUTTON,
                primaryTarget = Target.ABOUT_PHONE,
                secondary = DEVELOPER_OPTIONS_BUTTON,
                secondaryTarget = Target.DEVELOPER_OPTIONS,
                status = "Active les options développeur : 7 appuis dans À propos du téléphone",
            )
        }

        return Step(
            title = "Dernière étape",
            body = "Dans les options développeur, descends jusqu'à « Sélectionner l'application de position fictive » " +
                "et choisis Anyloc. Reviens ensuite dans Anyloc.",
            primary = DEVELOPER_OPTIONS_BUTTON,
            primaryTarget = Target.DEVELOPER_OPTIONS,
            secondary = ABOUT_PHONE_BUTTON,
            secondaryTarget = Target.ABOUT_PHONE,
            status = "Choisis Anyloc dans Options développeur → Application de position fictive",
        )
    }
}
