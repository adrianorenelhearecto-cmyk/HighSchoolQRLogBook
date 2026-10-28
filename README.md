# High School for Service and Learning QR Logbook

## Run locally in VS Code

Install Python 3, open this folder in VS Code, and press **F5**. The included VS Code launch task starts a local web server at `http://127.0.0.1:8080/` before opening Chrome. Alternatively, serve this folder from `localhost` with VS Code Live Server. Service workers do not work from a `file://` URL.

After the first successful load, the app shell and its assets are cached for offline use. QR generation and scanning libraries are stored locally. Browser camera access requires a secure context such as `localhost` or HTTPS; on a phone, use the deployed HTTPS site rather than a local network HTTP address. Allow camera permission when your browser prompts you.

## Publish on GitHub Pages

The included GitHub Actions workflow deploys the site when changes are pushed to `main`. In the repository settings, open **Pages** and set the build and deployment source to **GitHub Actions**. After the workflow succeeds, the site is available at `https://adrianorenelhearecto-cmyk.github.io/HighSchoolQRLogBook/`.

The app name is set to **High School for Service and Learning** in the page title and web app manifest. The manifest uses a relative start URL so it works at the host's root or under a subpath.