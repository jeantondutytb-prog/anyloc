plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

import java.util.Properties

android {
    namespace = "io.anyloc.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "io.anyloc.app"
        minSdk = 29
        targetSdk = 34
        // CI passes the build number: each release gets a higher versionCode, which
        // Android needs to install it over the previous one (in-app updates).
        val buildNumber = System.getenv("ANDROID_VERSION_CODE")?.toIntOrNull() ?: 3
        versionCode = buildNumber
        versionName = "0.1.$buildNumber"

        // Phones only: the x86 builds of the map library doubled the APK size.
        ndk {
            abiFilters += listOf("arm64-v8a", "armeabi-v7a")
        }
    }

    signingConfigs {
        create("release") {
            // Always the same key (secrets in CI, keystore.properties locally):
            // Android refuses an update signed with another key.
            val ciKeystore = System.getenv("ANDROID_KEYSTORE_FILE")
            val keystorePropertiesFile = rootProject.file("keystore.properties")
            if (!ciKeystore.isNullOrBlank()) {
                storeFile = file(ciKeystore)
                storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("ANDROID_KEY_ALIAS")
                keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
            } else if (keystorePropertiesFile.exists()) {
                val keystoreProperties = Properties().apply {
                    keystorePropertiesFile.inputStream().use { load(it) }
                }

                storeFile = rootProject.file(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            val hasReleaseKey = !System.getenv("ANDROID_KEYSTORE_FILE").isNullOrBlank() ||
                rootProject.file("keystore.properties").exists()
            signingConfig = if (hasReleaseKey) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    applicationVariants.all {
        outputs.all {
            (this as com.android.build.gradle.internal.api.BaseVariantOutputImpl).outputFileName =
                "Anyloc-${versionName}-${buildType.name}.apk"
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.2.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("androidx.browser:browser:1.8.0")
    implementation("org.maplibre.gl:android-sdk:11.5.2")
    implementation("com.google.android.gms:play-services-location:21.3.0")
}
