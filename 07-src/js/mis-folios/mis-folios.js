/* ================================================================
   Mis Folios — Arranque del módulo
   MIS-FOLIOS-CRM-ATC-01 · Fase 2 · Fable 5

   Único punto de contacto entre el App Shell y el módulo. app.js llama
   `ATCMisFolios.activar()` al entrar a la vista y nada más; el módulo
   no toca el DOM fuera de su contenedor ni registra listeners globales.

   Se carga después de auth.js y antes de app.js. Debe ser idempotente:
   entrar y salir de la vista varias veces no debe duplicar estado ni
   suscripciones.

   Identidad: el módulo NO lee el oid del token ni lo envía a ninguna
   parte. Con el adaptador mock, la sesión simulada se fija en
   `configurarSesionSimulada`, que existe solo mientras el adaptador
   real no esté disponible y desaparece cuando lo esté.
   ================================================================ */
(function (global) {
  "use strict";

  var Pagina = global.ATCMisFoliosPagina;
  var Adaptadores = global.ATCMisFoliosAdaptadores;
  var Estado = global.ATCMisFoliosEstado;

  var montado = false;
  var contenedorActual = null;

  /* Sesión simulada predeterminada. PERSONA PRUEBA 04 tiene perfil
     GERENCIA para que la vista de supervisión sea visible al abrir el
     módulo sin configurar nada. Cambiar de perfil es una decisión de
     prueba, no de producto — de ahí que viva en el arranque y no en el
     estado del módulo. */
  var SESION_SIMULADA_PREDETERMINADA = {
    oid: "00000000-0000-4000-8000-000000000004",
    perfil: "GERENCIA"
  };

  var sesionSimulada = SESION_SIMULADA_PREDETERMINADA;

  function configurarSesionSimulada(oid, perfil) {
    sesionSimulada = { oid: oid, perfil: perfil };
    if (!montado) return Promise.resolve(false);

    /* El contenedor se captura antes de desactivar, porque `desactivar()`
       pone `contenedorActual` en null y el remontaje quedaría dependiendo
       de que la búsqueda por [data-mf-raiz] encuentre el mismo nodo. */
    var destino = contenedorActual;
    desactivar();
    return activar(destino);
  }

  function contenedorPredeterminado() {
    return global.document.querySelector("[data-mf-raiz]");
  }

  function activar(contenedor) {
    var destino = contenedor || contenedorPredeterminado();

    if (!destino) {
      if (global.console && global.console.error) {
        global.console.error("[mis-folios] no se encontró el contenedor [data-mf-raiz].");
      }
      return Promise.resolve(false);
    }

    /* Reentrada: si ya está montado en el mismo contenedor, se recarga el
       listado en vez de volver a montar. Evita suscripciones duplicadas al
       store, que es el defecto clásico de un módulo que se activa cada vez
       que el usuario vuelve a la pestaña. */
    if (montado && contenedorActual === destino) {
      return Pagina._acciones.cargarListado().then(function () { return true; });
    }

    if (montado) desactivar();

    var adaptador;
    try {
      /* La resolución del adaptador depende de la configuración de entorno.
         Si el entorno es dev y falta algo, esto lanza — y ese lanzamiento
         es el comportamiento correcto: no hay respaldo al mock. */
      adaptador = Adaptadores.obtener();
    } catch (error) {
      mostrarAvisoDeArranque(destino, error);
      return Promise.resolve(false);
    }

    return adaptador.inicializar({ sesionOid: sesionSimulada.oid }).then(function () {
      montado = true;
      contenedorActual = destino;
      return Pagina.montar(destino, { perfilSesion: sesionSimulada.perfil });
    }).then(function () {
      return true;
    }, function (error) {
      /* Si el adaptador no arranca, el módulo se queda vacío con un aviso.
         No se cae al mock en silencio: eso ocultaría que la conexión real
         falló y daría por buenos datos que no lo son. */
      montado = false;
      contenedorActual = null;
      mostrarAvisoDeArranque(destino, error);
      return false;
    });
  }

  /* Distingue un fallo de configuración de un fallo del servicio. Son dos
     incidencias distintas y las resuelven personas distintas: la primera
     es de quien despliega, la segunda de quien opera la plataforma. */
  function mostrarAvisoDeArranque(destino, error) {
    var U = global.ATCMisFoliosComponentes;
    var deConfiguracion = !!(error && error.esErrorConfiguracion);

    U.vaciar(destino);
    destino.appendChild(U.bandaError({
      mensaje: deConfiguracion
        ? "Mis Folios no está configurado."
        : "Mis Folios no pudo iniciar.",
      detalle: deConfiguracion
        ? "El entorno declarado no tiene una configuración válida. No se muestran datos simulados en su lugar. Reporta la incidencia a quien despliega el CRM."
        : "El origen de datos no está disponible. Reporta la incidencia a la Coordinación."
    }));

    /* Los detalles del problema quedan solo en consola, y solo los nombres
       de las claves que faltan: nunca destinos, tokens ni cuerpos. */
    if (deConfiguracion && global.console && global.console.error) {
      global.console.error("[mis-folios] configuración incompleta");
    }
  }

  function desactivar() {
    if (!montado) return;

    /* Cualquier solicitud en vuelo se aborta: una respuesta tardía no debe
       tocar una pantalla que ya no existe. */
    var adaptador = null;
    try { adaptador = Adaptadores.obtener(); } catch (e) { adaptador = null; }
    if (adaptador && typeof adaptador.cancelarTodo === "function") adaptador.cancelarTodo();

    Pagina.desmontar();
    montado = false;
    contenedorActual = null;
  }

  global.ATCMisFolios = Object.freeze({
    activar: activar,
    desactivar: desactivar,
    estaMontado: function () { return montado; },

    /* Devuelve null si la configuración no permite resolver un adaptador.
       No se inventa "mock" como respuesta tranquilizadora. */
    adaptadorActivo: function () {
      try { return Adaptadores.obtener().nombre; } catch (e) { return null; }
    },

    /* Resumen sin destino ni transporte, apto para pintar o documentar. */
    diagnostico: function () {
      return {
        montado: montado,
        adaptador: (function () {
          try { return Adaptadores.obtener().nombre; } catch (e) { return null; }
        })(),
        configuracion: global.ATCMisFoliosConfig.resumenSeguro()
      };
    },

    configurarSesionSimulada: configurarSesionSimulada,
    obtenerEstado: Estado.obtener
  });
})(typeof window !== "undefined" ? window : globalThis);
