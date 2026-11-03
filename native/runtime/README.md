# Android native build input

`android-runtime.zip` is a checked-in, version-neutral build dependency, not a historical installation package. It contains the recovered native `classes.dex`, Android resources, manifest and Capacitor configuration. Its 585 files are hashed in `runtime-lock.json`.

It contains no `assets/public/`, signatures, signing keys, DataVault build outputs or user data. Each build starts with an empty web directory, copies the current `dist/` and compiles `native/src/` afresh. It does not read or download an old APK. Historical release APKs can therefore be deleted independently.

The native wrapper was originally recovered from v1.0.7 and checked against v1.0.15; provenance is retained in the lock. The original Gradle/Java sources have not been recovered. This archive does not claim to replace those missing sources. `classes.dex` includes the existing GitHub updater and Capacitor runtime. Keep its package and WebView origin stable when changing it.

Run `scripts/build-release.ps1` to build; `prepare-runtime.py` verifies every archive/file hash before extraction. APK signing still requires the separately protected `private-signing/` credentials and must not change during updates.
