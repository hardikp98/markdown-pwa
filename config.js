/* Public OAuth client IDs (safe to commit — browser OAuth uses no secret).
   Fill these in after registering the app (see SETUP.md). Leave blank to hide that provider. */
window.MD_CONFIG = {
  // Google Cloud Console → Credentials → OAuth client ID (type: Web application)
  GOOGLE_CLIENT_ID: "660337561069-8ttd3ql6oih7e6qepkhtra3u454bl8er.apps.googleusercontent.com",
  // Google Cloud Console → Credentials → API key (for the Picker); restrict to your Pages domain
  GOOGLE_API_KEY: "AIzaSyA-Y8ZT8Ml55auF3ip7MXep6axIQepvjG4",
  // Azure → App registration → Application (client) ID  (redirect type: SPA)
  MS_CLIENT_ID: "",
  // "common" lets both personal + work Microsoft accounts sign in
  MS_AUTHORITY: "https://login.microsoftonline.com/common"
};
