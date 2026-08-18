  /* Módulo de autenticación (MIS-FOLIOS-CRM-ATC-01, Fase 1).
     Única fuente de verdad de sesión e identidad en el frontend. Ningún otro módulo
     debe leer msalInstance, cuentas ni tokens directamente — todo pasa por ATCAuth. */
  (function (global) {
    "use strict";

    var ESTADOS = {
      NO_INICIALIZADO: "no_inicializado",
      COMPROBANDO_SESION: "comprobando_sesion",
      AUTENTICADO: "autenticado",
      NO_AUTENTICADO: "no_autenticado",
      ACCESO_DENEGADO: "acceso_denegado", /* reservado para Fase 2 (catálogo de usuarios) */
      SESION_EXPIRADA: "sesion_expirada",
      ERROR: "error",
      CERRANDO_SESION: "cerrando_sesion"
    };

    var estadoActual = ESTADOS.NO_INICIALIZADO;
    var msalInstance = null;
    var listeners = {};
    var adquisicionEnCurso = null; /* single-flight para acquireTokenSilent */
    var loginEnCurso = false;
    var identidadVisible = null; /* solo lo necesario para UI, nunca claims completas */

    function emitir(evento, datos) {
      (listeners[evento] || []).forEach(function (cb) {
        try {
          cb(datos);
        } catch (_e) {
          /* un listener roto no debe romper el módulo de auth */
        }
      });
    }

    function on(evento, cb) {
      if (typeof cb !== "function") return;
      if (!listeners[evento]) listeners[evento] = [];
      listeners[evento].push(cb);
    }

    function cambiarEstado(nuevoEstado, detalle) {
      estadoActual = nuevoEstado;
      emitir("cambioEstado", { estado: nuevoEstado, detalle: detalle || null });
    }

    /* Nunca reproduce el objeto de error completo, ni tokens, ni claims. */
    function sanitizarError(error) {
      var codigo = (error && error.errorCode) ? error.errorCode : "error_desconocido";
      return {
        codigo: codigo,
        mensaje: "Ocurrió un problema al procesar la sesión. Intenta de nuevo."
      };
    }

    /* Quita de la URL los parámetros que MSAL deja tras procesar el redirect
       (state, code, session_state, etc.), sin recargar la página y conservando
       protocolo, host (hostname+puerto) y ruta exactamente iguales. No se
       registra ni se expone el valor de "state" en ningún momento. */
    function limpiarParametrosRedirectDeUrl() {
      if (!global.history || typeof global.history.replaceState !== "function") return;
      var loc = global.location;
      var urlLimpia = loc.protocol + "//" + loc.host + loc.pathname;
      global.history.replaceState(null, "", urlLimpia);
    }

    function esInteractionRequired(error) {
      return !!(
        global.msal &&
        global.msal.InteractionRequiredAuthError &&
        error instanceof global.msal.InteractionRequiredAuthError
      );
    }

    function textoPlano(valor) {
      return typeof valor === "string" ? valor.trim() : "";
    }

    function establecerIdentidadDesdeCuenta(cuenta) {
      if (!cuenta) {
        identidadVisible = null;
        return;
      }
      /* Solo presentación — nunca autorización.
         `name` es el nombre para mostrar y `username` el UPN corporativo.
         NO se conserva ni se expone oid, tid, tokens ni claims (2026-08-13). */
      identidadVisible = {
        nombre: textoPlano(cuenta.name),
        correo: textoPlano(cuenta.username)
      };
      emitir("identidad", { nombre: identidadVisible.nombre, correo: identidadVisible.correo });
    }

    async function inicializar() {
      if (msalInstance) {
        /* Ya inicializado — una sola PublicClientApplication por sesión de página. */
        return;
      }

      var config = global.ATC_AUTH_CONFIG;

      if (!config || !config.hostnameAutorizado) {
        cambiarEstado(ESTADOS.ERROR, {
          mensaje: (config && config.errorConfiguracion) || "Configuración de autenticación no disponible."
        });
        return;
      }

      if (typeof global.msal === "undefined" || !global.msal.PublicClientApplication) {
        cambiarEstado(ESTADOS.ERROR, { mensaje: "No se pudo cargar el módulo de autenticación." });
        return;
      }

      cambiarEstado(ESTADOS.COMPROBANDO_SESION);

      try {
        msalInstance = new global.msal.PublicClientApplication(config.msalConfig);
        await msalInstance.initialize();
      } catch (error) {
        msalInstance = null;
        cambiarEstado(ESTADOS.ERROR, sanitizarError(error));
        return;
      }

      /* handleRedirectPromise debe procesarse antes de cualquier otra operación,
         y nunca debe disparar una redirección automática por sí mismo. */
      try {
        var respuestaRedirect = await msalInstance.handleRedirectPromise();
        if (respuestaRedirect && respuestaRedirect.account) {
          msalInstance.setActiveAccount(respuestaRedirect.account);
        }
        if (respuestaRedirect) {
          /* Solo se limpia la URL cuando realmente hubo un retorno de redirección
             (parámetros como "state" presentes) — no en cargas normales. */
          limpiarParametrosRedirectDeUrl();
        }
      } catch (error) {
        cambiarEstado(ESTADOS.ERROR, sanitizarError(error));
        return;
      }

      var cuentas = msalInstance.getAllAccounts();
      if (cuentas.length > 0) {
        if (!msalInstance.getActiveAccount()) {
          msalInstance.setActiveAccount(cuentas[0]);
        }
        establecerIdentidadDesdeCuenta(msalInstance.getActiveAccount());
        cambiarEstado(ESTADOS.AUTENTICADO);
      } else {
        cambiarEstado(ESTADOS.NO_AUTENTICADO);
      }
    }

    /* loginRedirect es el único mecanismo de Fase 1 — nunca popup, nunca automático. */
    async function iniciarSesion() {
      if (!msalInstance) return;
      if (loginEnCurso) return; /* evita interaction_in_progress por doble clic */

      loginEnCurso = true;
      try {
        await msalInstance.loginRedirect(global.ATC_AUTH_CONFIG.loginRequest);
        /* loginRedirect navega fuera de la página; no hay continuación útil aquí. */
      } catch (error) {
        loginEnCurso = false;
        if (error && error.errorCode === "interaction_in_progress") {
          /* Ya hay una interacción de MSAL en curso (p. ej. tras recargar durante
             un redirect todavía no resuelto) — no se trata como error fatal. */
          return;
        }
        cambiarEstado(ESTADOS.ERROR, sanitizarError(error));
      }
    }

    async function cerrarSesion() {
      if (!msalInstance) return;

      cambiarEstado(ESTADOS.CERRANDO_SESION);
      emitir("limpiarUI", {});
      identidadVisible = null;

      try {
        await msalInstance.logoutRedirect({
          postLogoutRedirectUri: global.ATC_AUTH_CONFIG.msalConfig.auth.postLogoutRedirectUri
        });
      } catch (error) {
        cambiarEstado(ESTADOS.ERROR, sanitizarError(error));
      }
    }

    async function adquirirTokenSilencioso() {
      if (!msalInstance) {
        throw new Error("auth_no_inicializado");
      }
      var cuenta = msalInstance.getActiveAccount();
      if (!cuenta) {
        throw new Error("sin_cuenta_activa");
      }

      if (adquisicionEnCurso) {
        return adquisicionEnCurso;
      }

      adquisicionEnCurso = msalInstance
        .acquireTokenSilent({
          scopes: global.ATC_AUTH_CONFIG.loginRequest.scopes,
          account: cuenta
        })
        .then(function (resultado) {
          adquisicionEnCurso = null;
          return resultado.accessToken;
        })
        .catch(function (error) {
          adquisicionEnCurso = null;
          if (esInteractionRequired(error)) {
            cambiarEstado(ESTADOS.SESION_EXPIRADA);
          }
          throw error; /* el llamador decide; el error crudo nunca se registra aquí */
        });

      return adquisicionEnCurso;
    }

    /* tokenProvider: único punto de acceso al token para el resto del CRM.
       Fase 1 solo define esta función; ningún módulo la consume todavía
       (api-client.js no existe — se crea en Fase 3+). */
    async function tokenProvider() {
      return adquirirTokenSilencioso();
    }

    function obtenerEstado() {
      return estadoActual;
    }

    /* Devuelve EXCLUSIVAMENTE nombre y correo. Nunca localAccountId, oid,
       tenantId, idToken, accessToken, claims ni ningún otro dato de MSAL. */
    function obtenerIdentidadVisible() {
      if (!identidadVisible) return null;
      return { nombre: identidadVisible.nombre, correo: identidadVisible.correo };
    }

    global.ATCAuth = Object.freeze({
      ESTADOS: ESTADOS,
      inicializar: inicializar,
      iniciarSesion: iniciarSesion,
      cerrarSesion: cerrarSesion,
      tokenProvider: tokenProvider,
      obtenerEstado: obtenerEstado,
      obtenerIdentidadVisible: obtenerIdentidadVisible,
      on: on
    });
  })(window);
