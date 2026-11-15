package io.anyloc.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SetupGuideTest {

    @Test
    fun aboutPhoneIsTheMainButtonUntilDeveloperOptionsAreOn() {
        val step = SetupGuide.step("Google", developerOptionsEnabled = false)
        assertEquals(SetupGuide.ABOUT_PHONE_BUTTON, step.primary)
        assertEquals(SetupGuide.Target.ABOUT_PHONE, step.primaryTarget)
        assertEquals(SetupGuide.Target.DEVELOPER_OPTIONS, step.secondaryTarget)
    }

    @Test
    fun developerOptionsBecomeTheMainButtonOnceOn() {
        val step = SetupGuide.step("Google", developerOptionsEnabled = true)
        assertEquals(SetupGuide.DEVELOPER_OPTIONS_BUTTON, step.primary)
        assertEquals(SetupGuide.Target.DEVELOPER_OPTIONS, step.primaryTarget)
        assertTrue(step.body.contains("position fictive"))
        assertTrue(step.body.contains("Anyloc"))
    }

    @Test
    fun samsungPointsToSoftwareInformationAndVersionNumber() {
        val body = SetupGuide.step("samsung", developerOptionsEnabled = false).body
        assertTrue(body.contains("Informations sur le logiciel"))
        assertTrue(body.contains("Numéro de version"))
        assertFalse(body.contains("Numéro de build"))
    }

    @Test
    fun xiaomiRedmiAndPocoPointToTheMiuiOrHyperOsVersion() {
        for (maker in listOf("Xiaomi", "Redmi", "POCO")) {
            assertEquals(SetupGuide.Brand.XIAOMI, SetupGuide.brandOf(maker))
            val body = SetupGuide.step(maker, developerOptionsEnabled = false).body
            assertTrue(body.contains("Version MIUI"))
            assertTrue(body.contains("HyperOS"))
        }
    }

    @Test
    fun otherBrandsPointToTheBuildNumber() {
        for (maker in listOf("Google", "OnePlus", "motorola", "", null)) {
            assertEquals(SetupGuide.Brand.OTHER, SetupGuide.brandOf(maker))
            assertTrue(SetupGuide.step(maker, developerOptionsEnabled = false).body.contains("« Numéro de build »"))
        }
    }

    @Test
    fun noLongerClaimsTheButtonsOpenTheRightMenus() {
        for (enabled in listOf(false, true)) {
            assertFalse(SetupGuide.step("samsung", enabled).body.contains("bons menus"))
        }
    }
}
