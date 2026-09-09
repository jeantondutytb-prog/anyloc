# IDevice.xcframework

Bibliothèque Rust [jkcoxson/idevice](https://github.com/jkcoxson/idevice) compilée pour iOS.
Elle permet à l'app Anyloc d'appliquer une position GPS système via les services développeur Apple
(même mécanisme que Xcode / LocalDevVPN).

Ce dossier n'est **pas versionné** (~170 Mo). Génère-le avant le build IPA :

```bash
./scripts/build-idevice-xcframework.sh
```

Le workflow GitHub Actions `build-ios.yml` le construit automatiquement sur macOS.
