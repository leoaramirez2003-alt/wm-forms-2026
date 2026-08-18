/* ================================================================
   Mis Folios — Adaptador DEV
   MIS-FOLIOS-CRM-ATC-01 · Fase 2 · Fable 5

   Implementa las catorce operaciones del contrato: validación de sobre,
   ETag, correlación, paginación, tiempo límite, cancelación, validación
   de respuesta y normalización contractual.

   NO CONTIENE NINGUNA URL, RECURSO, INQUILINO, TOKEN NI SECRETO, y no
   debe contenerlos nunca. El destino vive en `transportFn`, que inyecta
   la misión que conecte DEV. Esa separación es deliberada: permite
   construir, revisar y probar todo el comportamiento del adaptador antes
   de que exista una sola línea capaz de hacer red.

   ---------------------------------------------------------------
   Contrato del transporte
   ---------------------------------------------------------------
   transportFn(peticion) -> Promise<{ estadoHttp: number, cuerpo: object|null }>

   peticion = {
     operacion,        nombre contractual de la operación
     esEscritura,      si exige If-Match
     folioItemId,      entero o null
     etag,             valor opaco leído, o null
     correlacionId,    UUID
     payload,          objeto propio de la operación
     senal,            AbortSignal; el transporte DEBE respetarla
     timeoutMs
   }

   El transporte resuelve el destino, adjunta el token obtenido de
   `window.ATCAuth.tokenProvider()` y traduce `etag` a `If-Match`. El
   adaptador nunca ve la URL ni el token.

   ---------------------------------------------------------------
   Lo que este adaptador rechaza por diseño
   ---------------------------------------------------------------
   - una escritura sin ETag, sin llegar a salir a la red;
   - un ETag comodín `*`, que anularía el control de concurrencia;
   - una respuesta que no sea del contrato, aunque llegue con HTTP 200;
   - una respuesta cuya operación o correlación no sean las solicitadas;
   - un éxito de escritura sin `etag` ni `versionNegocio`;
   - un código de error desconocido.

   Ninguna de esas condiciones se degrada a dato válido.
   ================================================================ */
(function (global) {
  "use strict";

  var C = global.ATCMisFoliosContratos;
  var Config = global.ATCMisFoliosConfig;

  /* Perfil de cada operación. Es la única tabla que decide si una
     operación exige folio o ETag, y reproduce el contrato §10 a §23. */
  var PERFIL = {};
  PERFIL[C.OPERACIONES.CONSULTAR_MIS_FOLIOS]          = { escritura: false, folio: false, etag: false, paginada: true };
  PERFIL[C.OPERACIONES.CONSULTAR_TODOS_FOLIOS]        = { escritura: false, folio: false, etag: false, paginada: true };
  PERFIL[C.OPERACIONES.OBTENER_FOLIO]                 = { escritura: false, folio: true,  etag: false, paginada: false };
  PERFIL[C.OPERACIONES.VALIDAR_DUPLICADO]             = { escritura: false, folio: false, etag: false, paginada: false };
  PERFIL[C.OPERACIONES.EDITAR_FOLIO]                  = { escritura: true,  folio: true,  etag: true,  paginada: false };
  PERFIL[C.OPERACIONES.CAMBIAR_ESTATUS]               = { escritura: true,  folio: true,  etag: true,  paginada: false };
  PERFIL[C.OPERACIONES.REASIGNAR_FOLIO]               = { escritura: true,  folio: true,  etag: true,  paginada: false };
  PERFIL[C.OPERACIONES.AGREGAR_COMENTARIO]            = { escritura: true,  folio: true,  etag: true,  paginada: false };
  PERFIL[C.OPERACIONES.LISTAR_COMENTARIOS]            = { escritura: false, folio: true,  etag: false, paginada: true };
  /* Las tres operaciones documentales escriben, pero el contrato §20.1 y
     §21.1 no incluyen `etag` en su sobre: la concurrencia se controla
     sobre el documento, no sobre el folio. */
  PERFIL[C.OPERACIONES.CARGAR_EVIDENCIA]              = { escritura: true,  folio: true,  etag: true,  paginada: false };
  PERFIL[C.OPERACIONES.INVALIDAR_EVIDENCIA]           = { escritura: true,  folio: true,  etag: false, paginada: false };
  PERFIL[C.OPERACIONES.SUSTITUIR_EVIDENCIA]           = { escritura: true,  folio: true,  etag: false, paginada: false };
  PERFIL[C.OPERACIONES.LISTAR_EVIDENCIAS]             = { escritura: false, folio: true,  etag: false, paginada: false };
  PERFIL[C.OPERACIONES.CONSULTAR_USUARIOS_ASIGNABLES] = { escritura: false, folio: false, etag: false, paginada: false };

  var OPERACIONES_SOPORTADAS = Object.keys(PERFIL);

  /* Correspondencia entre estado HTTP y código contractual, tomada de la
     columna "Estado conceptual" del contrato §8. Se usa solo cuando el
     cuerpo no trae un código propio: nunca se inventa uno mejor que el
     que declaró el servicio. */
  var CODIGO_POR_ESTADO = {
    400: "VALIDATION_ERROR",
    401: "AUTH_REQUIRED",
    403: "ROLE_NOT_ALLOWED",
    404: "FOLIO_NOT_FOUND",
    409: "INVALID_STATE_TRANSITION",
    412: "ETAG_MISMATCH",
    428: "ETAG_REQUIRED",
    502: "UPSTREAM_ERROR",
    503: "CATALOG_INTEGRITY_ERROR"
  };

  var MENSAJE_TIEMPO_AGOTADO = "El servicio tardó demasiado en responder. Intenta de nuevo.";
  var MENSAJE_CONFIG = "Mis Folios no está configurado para operar contra DEV. Revisa la configuración de entorno.";
  var MENSAJE_CONTRATO = "El servicio respondió algo que no corresponde al contrato de Mis Folios.";

  var inicializado = false;
  var enVuelo = [];

  /* ---------- Construcción de respuestas ---------- */

  function sobreBase(sobre) {
    return {
      operacion: (sobre && sobre.operacion) || null,
      folioItemId: sobre && sobre.folioItemId !== undefined ? sobre.folioItemId : null,
      correlacionId: (sobre && sobre.correlacionId) || null
    };
  }

  function respuestaError(sobre, codigo, mensaje, campos) {
    var cuerpo = {
      code: codigo,
      message: mensaje || C.MENSAJES_ERROR[codigo] || "No fue posible completar la operación.",
      retryable: C.ERRORES[codigo] ? C.ERRORES[codigo].reintentable : false
    };
    if (campos && campos.length) cuerpo.fields = campos;

    return Object.assign(sobreBase(sobre), { status: "error", error: cuerpo });
  }

  /* La cancelación NO es un error de negocio: ocurre porque el propio
     módulo descartó una solicitud que ya no interesa. Se devuelve con un
     estado propio para que la interfaz la ignore en silencio en vez de
     pintar una banda roja que confundiría al usuario. */
  function respuestaCancelada(sobre) {
    return Object.assign(sobreBase(sobre), { status: "cancelado" });
  }

  /* ---------- Validación del sobre ---------- */

  function validarSobre(sobre) {
    if (!sobre || typeof sobre !== "object") return { codigo: "INVALID_OPERATION" };
    if (!sobre.operacion || OPERACIONES_SOPORTADAS.indexOf(sobre.operacion) === -1) {
      return { codigo: "INVALID_OPERATION" };
    }
    if (!sobre.correlacionId) return { codigo: "VALIDATION_ERROR", campos: ["correlacionId"] };

    var perfil = PERFIL[sobre.operacion];

    if (perfil.folio) {
      var id = sobre.folioItemId;
      if (typeof id !== "number" || !isFinite(id) || id <= 0 || Math.floor(id) !== id) {
        return { codigo: "VALIDATION_ERROR", campos: ["folioItemId"] };
      }
    }

    if (perfil.etag) {
      if (sobre.etag === undefined || sobre.etag === null || sobre.etag === "") {
        return { codigo: "ETAG_REQUIRED" };
      }
      /* Prohibición explícita del modelo físico §8.2.6: nunca se reintenta
         con comodín. Se corta aquí para que no dependa de que el servicio
         lo rechace. */
      if (String(sobre.etag).trim() === "*" || String(sobre.etag).trim() === "\"*\"") {
        return { codigo: "ETAG_REQUIRED" };
      }
    }

    return null;
  }

  /* ---------- Validación de la respuesta ---------- */

  /* Devuelve null si el cuerpo es una respuesta contractual coherente con
     la solicitud, o el motivo del rechazo. Un cuerpo que no pase por aquí
     jamás llega a la interfaz como dato. */
  function motivoDeRechazo(sobre, cuerpo, perfil) {
    if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
      return "el cuerpo no es un objeto";
    }
    if (cuerpo.status !== "ok" && cuerpo.status !== "error") {
      return "status desconocido: " + JSON.stringify(cuerpo.status);
    }
    if (cuerpo.operacion !== sobre.operacion) {
      return "la operación de la respuesta no coincide con la solicitada";
    }
    if (cuerpo.correlacionId !== sobre.correlacionId) {
      return "la correlación de la respuesta no coincide con la enviada";
    }

    if (cuerpo.status === "error") {
      if (!cuerpo.error || typeof cuerpo.error !== "object") return "respuesta de error sin objeto error";
      if (!cuerpo.error.code || !C.ERRORES[cuerpo.error.code]) {
        return "código de error fuera del catálogo: " + JSON.stringify(cuerpo.error && cuerpo.error.code);
      }
      return null;
    }

    if (cuerpo.datos === undefined || cuerpo.datos === null) return "respuesta exitosa sin datos";

    /* Contrato §6: en escrituras, `etag` y `versionNegocio` son obligatorios.
       Aceptar un éxito sin ellos dejaría a la interfaz sin versión con la
       que volver a escribir, y el siguiente guardado iría a ciegas. */
    if (perfil.escritura && perfil.etag) {
      if (typeof cuerpo.etag !== "string" || cuerpo.etag === "") {
        return "escritura exitosa sin etag";
      }
      if (typeof cuerpo.versionNegocio !== "number") {
        return "escritura exitosa sin versionNegocio";
      }
    }

    if (perfil.paginada && cuerpo.datos && !Array.isArray(cuerpo.datos.items)) {
      return "respuesta paginada sin arreglo items";
    }

    return null;
  }

  /* ---------- Ejecución ---------- */

  function ejecutar(sobre) {
    if (!inicializado || !Config.esValida()) {
      return Promise.resolve(respuestaError(sobre, "UPSTREAM_ERROR", MENSAJE_CONFIG));
    }

    var invalido = validarSobre(sobre);
    if (invalido) {
      return Promise.resolve(respuestaError(sobre, invalido.codigo, null, invalido.campos));
    }

    var config = Config.obtener();
    var perfil = PERFIL[sobre.operacion];
    var controlador = new global.AbortController();
    var temporizador = null;
    var porTiempo = false;
    var resuelto = false;

    enVuelo.push(controlador);

    function soltar() {
      if (temporizador) global.clearTimeout(temporizador);
      var i = enVuelo.indexOf(controlador);
      if (i !== -1) enVuelo.splice(i, 1);
    }

    /* El plazo se resuelve en el propio adaptador, no se limita a avisar.
       Un transporte que ignore `senal` dejaría la promesa sin resolver para
       siempre y la pantalla colgada en «Cargando…» pese al timeout
       configurado. La señal se emite igualmente para que un transporte
       correcto aborte la petición de red. */
    var vencimiento = new Promise(function (resolver) {
      temporizador = global.setTimeout(function () {
        porTiempo = true;
        try { controlador.abort(); } catch (e) { /* ya abortado */ }
        resolver({ __vencido: true });
      }, config.timeoutMs);
    });

    /* Lo mismo para la cancelación explícita: si el transporte no reacciona
       al abort, el adaptador responde por su cuenta. */
    var cancelacion = new Promise(function (resolver) {
      controlador.signal.addEventListener("abort", function () {
        if (!porTiempo) resolver({ __cancelado: true });
      });
    });

    var peticion = {
      operacion: sobre.operacion,
      esEscritura: perfil.escritura,
      folioItemId: sobre.folioItemId === undefined ? null : sobre.folioItemId,
      etag: sobre.etag === undefined ? null : sobre.etag,
      correlacionId: sobre.correlacionId,
      payload: normalizarPayload(sobre, perfil, config),
      senal: controlador.signal,
      timeoutMs: config.timeoutMs
    };

    var llamada = Promise.resolve().then(function () { return config.transportFn(peticion); });

    return Promise.race([llamada, vencimiento, cancelacion])
      .then(function (resultado) {
        if (resuelto) return null;
        resuelto = true;
        soltar();

        if (resultado && resultado.__vencido) {
          return respuestaError(sobre, "UPSTREAM_ERROR", MENSAJE_TIEMPO_AGOTADO);
        }
        if (resultado && resultado.__cancelado) {
          return respuestaCancelada(sobre);
        }

        if (!resultado || typeof resultado !== "object") {
          return respuestaError(sobre, "UPSTREAM_ERROR", MENSAJE_CONTRATO);
        }

        var estado = resultado.estadoHttp;
        var cuerpo = resultado.cuerpo;

        /* Un estado HTTP fuera de 2xx nunca se trata como dato. Si el
           cuerpo trae un error contractual válido se respeta, porque es
           más preciso; si no, se deriva del estado. */
        if (typeof estado !== "number" || estado < 200 || estado >= 300) {
          var rechazo = motivoDeRechazo(sobre, cuerpo, perfil);
          if (!rechazo && cuerpo.status === "error") return cuerpo;

          var derivado = CODIGO_POR_ESTADO[estado] || "UPSTREAM_ERROR";
          return respuestaError(sobre, derivado);
        }

        var problema = motivoDeRechazo(sobre, cuerpo, perfil);
        if (problema) {
          /* El motivo se conserva para diagnóstico, no se muestra: podría
             arrastrar contenido del cuerpo, y el cuerpo puede traer PII. */
          var fallo = respuestaError(sobre, "UPSTREAM_ERROR", MENSAJE_CONTRATO);
          fallo.error.contrato = problema;
          return fallo;
        }

        return cuerpo;
      })
      .catch(function (error) {
        if (resuelto) return null;
        resuelto = true;
        soltar();

        if (porTiempo) {
          return respuestaError(sobre, "UPSTREAM_ERROR", MENSAJE_TIEMPO_AGOTADO);
        }
        if (esAbortada(error) || controlador.signal.aborted) {
          return respuestaCancelada(sobre);
        }
        /* El mensaje del error nunca se propaga: puede contener la URL, el
           cuerpo de la petición o datos personales. */
        return respuestaError(sobre, "UPSTREAM_ERROR");
      });
  }

  function esAbortada(error) {
    return !!error && (error.name === "AbortError" || error.esCancelacion === true);
  }

  /* Recorta el tamaño de página al máximo declarado y arrastra el cursor
     tal cual. El cursor es opaco: se devuelve al servicio sin interpretar,
     igual que el ETag. */
  function normalizarPayload(sobre, perfil, config) {
    var payload = sobre.payload || {};
    if (!perfil.paginada) return payload;

    var copia = {};
    Object.keys(payload).forEach(function (clave) { copia[clave] = payload[clave]; });

    var tamano = typeof copia.paginaTamano === "number" && copia.paginaTamano > 0
      ? copia.paginaTamano
      : config.defaultPageSize;

    copia.paginaTamano = Math.min(tamano, config.maxPageSize);
    copia.cursor = payload.cursor === undefined ? null : payload.cursor;
    return copia;
  }

  /* ---------- Ciclo de vida ---------- */

  function inicializar() {
    var fallos = Config.problemas();

    if (Config.obtener().environment !== Config.ENTORNOS.DEV) {
      fallos = fallos.concat([
        "El adaptador DEV se activó con environment distinto de \"dev\"."
      ]);
    }

    if (fallos.length) {
      var error = new Error("Adaptador DEV no configurado:\n  - " + fallos.join("\n  - "));
      error.esErrorConfiguracion = true;
      error.problemas = fallos;
      inicializado = false;
      return Promise.reject(error);
    }

    inicializado = true;
    return Promise.resolve();
  }

  /* Aborta lo que esté en vuelo. Lo llama el módulo al desmontarse para
     que una respuesta tardía no toque una pantalla que ya no existe. */
  function cancelarTodo() {
    var pendientes = enVuelo.slice();
    enVuelo = [];
    pendientes.forEach(function (controlador) {
      try { controlador.abort(); } catch (e) { /* ya abortado */ }
    });
    return pendientes.length;
  }

  global.ATCMisFoliosAdaptadorDev = Object.freeze({
    nombre: "dev",
    esSimulado: false,

    /* Refleja si la configuración permite operar. No es una promesa de que
       el servicio exista: es que el módulo tiene con qué intentarlo. */
    disponible: function () {
      return Config.obtener().environment === Config.ENTORNOS.DEV && Config.esValida();
    },

    inicializar: inicializar,
    ejecutar: ejecutar,
    cancelarTodo: cancelarTodo,

    operacionesSoportadas: function () { return OPERACIONES_SOPORTADAS.slice(); },
    perfilDeOperacion: function (operacion) {
      var p = PERFIL[operacion];
      return p ? { escritura: p.escritura, folio: p.folio, etag: p.etag, paginada: p.paginada } : null;
    },

    /* Documenta, sin ejecutarla, la forma que tendrá la llamada real.
       Permite auditar el contrato de transporte antes de que exista una
       sola línea capaz de hacer red. */
    formaDeLlamadaPrevista: Object.freeze({
      encabezados: Object.freeze([
        "Authorization: Bearer <token de ATCAuth.tokenProvider()>",
        "Content-Type: application/json",
        "If-Match: <etag leído; nunca *>",
        "X-Correlation-Id: <uuid>"
      ]),
      cuerpo: "Sobre de solicitud del contrato §5, sin oid",
      responsabilidadDelTransporte: Object.freeze([
        "resolver el destino de cada operación",
        "obtener y adjuntar el token",
        "traducir etag a If-Match",
        "respetar la señal de cancelación",
        "devolver { estadoHttp, cuerpo } sin interpretar el cuerpo"
      ])
    }),

    _pruebas: {
      enVuelo: function () { return enVuelo.length; },
      reiniciar: function () { cancelarTodo(); inicializado = false; }
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
