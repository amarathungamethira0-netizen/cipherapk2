# CipherLab Android build

CipherLab is fully offline. All mapping lists and matrix keys are stored in the
Android WebView's localStorage. No internet permission or backend is required.

## Local Android project

```bash
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

Run `npx cap add android` only once. After changing the React app, run:

```bash
npm run build
npx cap sync android
```

## Automatic APK release

Push a release tag to trigger `.github/workflows/build.yml` (it can also be
run manually from the Actions tab via **workflow_dispatch**):

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions builds an installable debug-signed APK and attaches it to the
matching GitHub Release as `CipherLab-v1.0.0.apk`.

## Local data keys

- `mapping_lists` contains Section 01 mapping profiles.
- `matrix_keys` contains Section 03 saved matrix keys.
- `cc.active.v1` remembers the selected mapping list.
- `cipherlab.auth.v1` remembers the local password unlock state.

Android may erase localStorage when the app is uninstalled or its app data is
cleared. Use Section 01 JSON export when a separate backup is needed.