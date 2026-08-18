/* ================================================================
   Mis Folios — Selector de adaptador
   MIS-FOLIOS-CRM-ATC-01 · Fase 2 · Fable 5

   El contrato §30 exige adaptadores intercambiables entre mocks y DEV.
   El intercambio ocurre aquí y en ningún otro punto: servicios, estado
   y componentes solo conocen `ejecutar(sobre) -> Promise<respuesta>`.

   ---------------------------------------------------------------
   Qué adaptador se activa
   ---------------------------------------------------------------
   Lo decide `ATCMisFoliosConfig.environment`, no una edición manual
   dispersa por el código. Cambiar de mock a DEV es un cambio de
   configuración declarado en el arranque, revisable en un solo lugar.

   ---------------------------------------------------------------
   Cierre por defecto
   ---------------------------------------------------------------
   Bajo `environment: "dev"` es imposible activar un adaptador simulado.
   No hay respaldo, ni automático ni manual: `seleccionar("mock")` lanza.

   El motivo no es purismo. Un respaldo silencioso haría que una lista
   vacía pareciera "no tienes folios" en vez de "no hay conexión", y que
   un guardado simulado se leyera como guardado real. La persona seguiría
   trabajando sobre datos que no existen.
   ================================================================ */
(function (global) {
  "use strict";

  var Config = global.ATCMisFoliosConfig;

  var REGISTRO = {
    mock: global.ATCMisFoliosAdaptadorMock,
    dev: global.ATCMisFoliosAdaptadorDev
  };

  var activo = null;

  function esSimulado(adaptador) {
    return !!(adaptador && adaptador.esSimulado === true);
  }

  function errorConfiguracion(mensaje, problemas) {
    var error = new Error(mensaje);
    error.esErrorConfiguracion = true;
    error.problemas = problemas || [];
    return error;
  }

  /* Punto de extensión del registro. Un adaptador debe exponer al menos
     `nombre`, `inicializar(opciones)` y `ejecutar(sobre)`; se comprueba
     aquí para que un adaptador incompleto falle al registrarse y no más
     tarde, en medio de una operación del usuario. */
  function registrar(nombre, adaptador) {
    if (!nombre || typeof nombre !== "string") {
      throw new Error("El adaptador necesita un nombre.");
    }
    if (!adaptador || typeof adaptador.ejecutar !== "function" || typeof adaptador.inicializar !== "function") {
      throw new Error("El adaptador '" + nombre + "' debe implementar inicializar() y ejecutar().");
    }
    REGISTRO[nombre] = adaptador;
    return adaptador;
  }

  function seleccionar(nombre) {
    var elegido = REGISTRO[nombre];
    if (!elegido) {
      throw new Error("Adaptador desconocido: " + nombre + ". Válidos: " + Object.keys(REGISTRO).join(", "));
    }

    var entorno = Config.obtener().environment;

    if (entorno === Config.ENTORNOS.DEV && esSimulado(elegido)) {
      throw errorConfiguracion(
        "No se puede activar el adaptador simulado '" + nombre + "' con environment \"dev\". " +
        "Un respaldo simulado presentaría datos fabricados como reales."
      );
    }

    activo = elegido;
    return activo;
  }

  /* Resuelve el adaptador que corresponde al entorno declarado. Si el
     entorno es `dev` y la configuración no está completa, lanza en vez de
     devolver algo que funcione a medias. */
  function resolverPorEntorno() {
    var config = Config.obtener();

    if (config.environment === Config.ENTORNOS.MOCK) {
      return seleccionar("mock");
    }

    if (config.environment === Config.ENTORNOS.DEV) {
      var fallos = Config.problemas();
      if (fallos.length) {
        throw errorConfiguracion(
          "Mis Folios está en entorno dev pero la configuración no está completa.",
          fallos
        );
      }
      return seleccionar("dev");
    }

    throw errorConfiguracion("environment desconocido: " + JSON.stringify(config.environment));
  }

  function obtener() {
    if (!activo) return resolverPorEntorno();

    /* Si el entorno cambió después de haber fijado un adaptador, manda el
       entorno. Evita que una selección vieja sobreviva a un cambio de
       configuración y opere en el modo equivocado. */
    var entorno = Config.obtener().environment;
    if (entorno === Config.ENTORNOS.DEV && esSimulado(activo)) return resolverPorEntorno();
    if (entorno === Config.ENTORNOS.MOCK && activo === REGISTRO.dev) return resolverPorEntorno();

    return activo;
  }

  function reiniciar() {
    activo = null;
  }

  global.ATCMisFoliosAdaptadores = Object.freeze({
    disponibles: function () { return Object.keys(REGISTRO); },
    registrar: registrar,
    seleccionar: seleccionar,
    resolverPorEntorno: resolverPorEntorno,
    obtener: obtener,
    reiniciar: reiniciar,
    esSimulado: esSimulado
  });
})(typeof window !== "undefined" ? window : globalThis);
