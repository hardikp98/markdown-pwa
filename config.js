/* Public OAuth client IDs (safe to commit — browser OAuth uses no secret).
   Fill these in after registering the app (see SETUP.md). Leave blank to hide that provider. */
window.MD_CONFIG = {
  // Google Cloud Console → Credentials → OAuth client ID (type: Web application)
  GOOGLE_CLIENT_ID: "",
  // Google Cloud Console → Credentials → API key (for the Picker); restrict to your Pages domain
  GOOGLE_API_KEY: "",
  // Azure → App registration → Application (client) ID  (redirect type: SPA)
  MS_CLIENT_ID: "",
  // "common" lets both personal + work Microsoft accounts sign in
  MS_AUTHORITY: "https://login.microsoftonline.com/common"
};
