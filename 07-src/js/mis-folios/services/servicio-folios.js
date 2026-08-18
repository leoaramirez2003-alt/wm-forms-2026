/* ================================================================
   Mis Folios — Servicio de operaciones
   MIS-FOLIOS-CRM-ATC-01 · Fase 2 · Fable 5

   Única capa que arma sobres de solicitud. Los componentes llaman
   funciones con nombre de negocio y nunca construyen JSON a mano, para
   que la forma del sobre (contrato §5) tenga un solo punto de cambio.

   Responsabilidades:
     - generar `correlacionId` por intento de escritura;
     - adjuntar el ETag leído en toda escritura;
     - normalizar la respuesta a { ok, datos, etag, versionNegocio } o
       a un error de contrato ya traducido a mensaje.

   No decide permisos. No calcula capacidades. No conoce URLs.
   ================================================================ */
(function (global) {
  "use strict";

  var C = global.ATCMisFoliosContratos;

  function adaptador() {
    return global.ATCMisFoliosAdaptadores.obtener();
  }

  /* UUID v4. Usa crypto.randomUUID cuando existe y cae a getRandomValues;
     ambos son criptográficamente seguros. Sin fallback a Math.random: una
     correlación predecible rompe la garantía de idempotencia del §24. */
  function nuevaCorrelacion() {
    var cripto = global.crypto || global.msCrypto;

    if (cripto && typeof cripto.randomUUID === "function") {
      return cripto.randomUUID();
    }
    if (cripto && typeof cripto.getRandomValues === "function") {
      var bytes = new Uint8Array(16);
      cripto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      var hex = [];
      for (var i = 0; i < 16; i++) hex.push((bytes[i] + 0x100).toString(16).slice(1));
      return hex.slice(0, 4).join("") + "-" + hex.slice(4, 6).join("") + "-" +
             hex.slice(6, 8).join("") + "-" + hex.slice(8, 10).join("") + "-" +
             hex.slice(10, 16).join("");
    }
    throw new Error("No hay una fuente de aleatoriedad segura para generar la correlación.");
  }

  function normalizar(respuesta) {
    /* Una solicitud cancelada no es un fallo del servicio ni del usuario:
       el propio módulo la descartó porque dejó de interesar. Se marca
       aparte para que la interfaz la ignore en vez de pintar un error que
       nadie provocó. */
    if (respuesta && respuesta.status === "cancelado") {
      return { ok: false, cancelado: true, code: null, mensaje: "", campos: [], reintentable: false };
    }

    if (!respuesta || respuesta.status !== "ok") {
      var e = (respuesta && respuesta.error) || {};
      var codigo = e.code && C.ERRORES[e.code] ? e.code : "UPSTREAM_ERROR";

      /* El mensaje que se muestra sale SIEMPRE del catálogo del contrato,
         nunca del cuerpo de la respuesta. Dos razones: el texto del
         servicio puede llegar en otro idioma o arrastrar detalle interno
         —nombres de listas, rutas, valores del registro—, y el contrato §7
         prohíbe devolver esa información al usuario. El `message` remoto se
         conserva aparte, sin pintarse, solo para diagnóstico. */
      return {
        ok: false,
        code: codigo,
        mensaje: C.MENSAJES_ERROR[codigo] || C.MENSAJES_ERROR.UPSTREAM_ERROR,
        mensajeRemoto: typeof e.message === "string" ? e.message : null,
        campos: e.fields || [],
        reintentable: C.ERRORES[codigo] ? C.ERRORES[codigo].reintentable : false
      };
    }
    return {
      ok: true,
      datos: respuesta.datos,
      etag: respuesta.etag,
      versionNegocio: respuesta.versionNegocio,
      fechaServidor: respuesta.fechaServidor
    };
  }

  function enviar(operacion, folioItemId, etag, payload, correlacionId) {
    var sobre = {
      operacion: operacion,
      correlacionId: correlacionId || nuevaCorrelacion(),
      payload: payload || {}
    };
    if (folioItemId !== null && folioItemId !== undefined) sobre.folioItemId = folioItemId;
    if (etag !== null && etag !== undefined) sobre.etag = etag;

    return adaptador().ejecutar(sobre).then(normalizar).then(function (resultado) {
      resultado.correlacionId = sobre.correlacionId;
      return resultado;
    });
  }

  /* ---------- Lecturas ---------- */

  function consultarFolios(alcance, filtros) {
    var operacion = alcance === "TODOS"
      ? C.OPERACIONES.CONSULTAR_TODOS_FOLIOS
      : C.OPERACIONES.CONSULTAR_MIS_FOLIOS;
    return enviar(operacion, null, null, filtros);
  }

  function obtenerFolio(folioItemId, opciones) {
    return enviar(C.OPERACIONES.OBTENER_FOLIO, folioItemId, null, {
      incluirComentarios: !opciones || opciones.incluirComentarios !== false,
      incluirEvidencias: !opciones || opciones.incluirEvidencias !== false,
      incluirTrazabilidad: !!(opciones && opciones.incluirTrazabilidad)
    });
  }

  function validarDuplicado(tipoGestion, folio, tipoAtencion, excluirFolioItemId) {
    return enviar(C.OPERACIONES.VALIDAR_DUPLICADO, null, null, {
      tipoGestion: tipoGestion,
      folio: folio,
      tipoAtencion: tipoAtencion,
      excluirFolioItemId: excluirFolioItemId || null
    });
  }

  function listarComentarios(folioItemId, orden) {
    return enviar(C.OPERACIONES.LISTAR_COMENTARIOS, folioItemId, null, { orden: orden || "ASC" });
  }

  function listarEvidencias(folioItemId) {
    return enviar(C.OPERACIONES.LISTAR_EVIDENCIAS, folioItemId, null, {});
  }

  function consultarUsuariosAsignables() {
    return enviar(C.OPERACIONES.CONSULTAR_USUARIOS_ASIGNABLES, null, null, {});
  }

  /* ---------- Escrituras ---------- */

  /* Todas exigen el ETag como parámetro explícito y ninguna lo lee del
     estado por su cuenta: quien llama debe demostrar que leyó el folio.
     Es lo que impide que un reintento use una versión que ya caducó. */

  function editarFolio(folioItemId, etag, cambios, correlacionId) {
    return enviar(C.OPERACIONES.EDITAR_FOLIO, folioItemId, etag, { cambios: cambios }, correlacionId);
  }

  function cambiarEstatus(folioItemId, etag, accion, motivo, correlacionId) {
    return enviar(C.OPERACIONES.CAMBIAR_ESTATUS, folioItemId, etag, {
      accion: accion,
      motivo: motivo || ""
    }, correlacionId);
  }

  function reasignarFolio(folioItemId, etag, responsableNuevoOid, motivo, correlacionId) {
    return enviar(C.OPERACIONES.REASIGNAR_FOLIO, folioItemId, etag, {
      responsableNuevoOid: responsableNuevoOid,
      motivo: motivo
    }, correlacionId);
  }

  function agregarComentario(folioItemId, etag, comentario, comentarioReferenciadoId, correlacionId) {
    return enviar(C.OPERACIONES.AGREGAR_COMENTARIO, folioItemId, etag, {
      comentario: comentario,
      comentarioReferenciadoId: comentarioReferenciadoId || null
    }, correlacionId);
  }

  function cargarEvidencia(folioItemId, etag, archivo, correlacionId) {
    /* El binario no viaja aquí. El contrato §19.2 lo deja como
       `contenidoReferencia` hasta que se elija la tecnología de
       transporte, y este módulo no la elige. */
    return enviar(C.OPERACIONES.CARGAR_EVIDENCIA, folioItemId, etag, {
      nombreArchivo: archivo.nombreArchivo,
      tipoContenido: archivo.tipoContenido || "",
      tamanoBytes: archivo.tamanoBytes || 0,
      contenidoReferencia: archivo.contenidoReferencia || null
    }, correlacionId);
  }

  function invalidarEvidencia(folioItemId, evidenciaItemId, motivo, correlacionId) {
    return enviar(C.OPERACIONES.INVALIDAR_EVIDENCIA, folioItemId, null, {
      evidenciaItemId: evidenciaItemId,
      motivo: motivo
    }, correlacionId);
  }

  function sustituirEvidencia(folioItemId, evidenciaAnteriorItemId, motivo, nuevaEvidencia, correlacionId) {
    return enviar(C.OPERACIONES.SUSTITUIR_EVIDENCIA, folioItemId, null, {
      evidenciaAnteriorItemId: evidenciaAnteriorItemId,
      motivo: motivo,
      nuevaEvidencia: {
        nombreArchivo: nuevaEvidencia.nombreArchivo,
        tipoContenido: nuevaEvidencia.tipoContenido || "",
        tamanoBytes: nuevaEvidencia.tamanoBytes || 0,
        contenidoReferencia: nuevaEvidencia.contenidoReferencia || null
      }
    }, correlacionId);
  }

  global.ATCMisFoliosServicio = Object.freeze({
    nuevaCorrelacion: nuevaCorrelacion,
    consultarFolios: consultarFolios,
    obtenerFolio: obtenerFolio,
    validarDuplicado: validarDuplicado,
    listarComentarios: listarComentarios,
    listarEvidencias: listarEvidencias,
    consultarUsuariosAsignables: consultarUsuariosAsignables,
    editarFolio: editarFolio,
    cambiarEstatus: cambiarEstatus,
    reasignarFolio: reasignarFolio,
    agregarComentario: agregarComentario,
    cargarEvidencia: cargarEvidencia,
    invalidarEvidencia: invalidarEvidencia,
    sustituirEvidencia: sustituirEvidencia
  });
})(typeof window !== "undefined" ? window : globalThis);
