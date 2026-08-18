  /* ConfiguraciÃ³n no secreta de autenticaciÃ³n (MIS-FOLIOS-CRM-ATC-01, Fase 1).
     Client ID y Tenant ID no son secretos, pero no se inventan aquÃ­: quedan como
     marcadores hasta que 07-src/tools/configurar-entra-dev.ps1 los sustituya. */
  (function (global) {
    "use strict";

    var ENTRA_CLIENT_ID = "f3a31ab8-a5f5-4a76-9211-4055c4ed7176";
    var ENTRA_TENANT_ID = "abb9b2bf-39d4-4621-8be8-53022aab1ab4";

    /* Allowlist de hostname â†’ redirect URI exacta (nunca se construye desde query string). */
    var REDIRECT_URI_POR_HOSTNAME = {
      "localhost": "http://localhost:8000/07-src/html/atc_modular_seguridad_dev.html"
    };

    var POST_LOGOUT_REDIRECT_URI_POR_HOSTNAME = {
      "localhost": "http://localhost:8000/07-src/html/atc_modular_seguridad_dev.html"
    };

    function resolverUriPorHostname(tabla, hostname) {
      if (Object.prototype.hasOwnProperty.call(tabla, hostname)) {
        return tabla[hostname];
      }
      return null;
    }

    function construirAuthConfig() {
      var hostname = global.location.hostname;
      var redirectUri = resolverUriPorHostname(REDIRECT_URI_POR_HOSTNAME, hostname);
      var postLogoutRedirectUri = resolverUriPorHostname(POST_LOGOUT_REDIRECT_URI_POR_HOSTNAME, hostname);

      if (!redirectUri) {
        /* Hostname desconocido: no se inicializa login, no hay fallback, no se
           construye una redirect URI a partir de query string ni de location.href. */
        return {
          hostnameAutorizado: false,
          errorConfiguracion: "Este entorno no estÃ¡ autorizado para iniciar sesiÃ³n. Contacta al administrador del CRM."
        };
      }

      return {
        hostnameAutorizado: true,
        errorConfiguracion: null,
        msalConfig: {
          auth: {
            clientId: ENTRA_CLIENT_ID,
            authority: "https://login.microsoftonline.com/" + ENTRA_TENANT_ID,
            redirectUri: redirectUri,
            postLogoutRedirectUri: postLogoutRedirectUri,
            navigateToLoginRequestUrl: false
          },
          cache: {
            cacheLocation: "sessionStorage",
            storeAuthStateInCookie: false
          }
        },
        loginRequest: {
          /* Scopes mÃ­nimos â€” sin Microsoft Graph, sin `groups` (D-MF-01). */
          scopes: ["openid", "profile"]
        }
      };
    }

    global.ATC_AUTH_CONFIG = Object.freeze(construirAuthConfig());
  })(window);
