/* ================================================================
   Mis Folios — Adaptador Mock
   MIS-FOLIOS-CRM-ATC-01 · Fase 2 · Fable 5

   Simula la CAPA DE OPERACIÓN, no el frontend. Es la única pieza del
   módulo que decide autorización, propiedad, allowlist, ETag y
   capacidades — exactamente donde vivirán esas decisiones cuando el
   adaptador real las delegue al servicio.

   Por eso el oid de sesión se inyecta en `inicializar` y NO se lee del
   sobre de solicitud: el contrato §5.2 establece que ningún oid enviado
   dentro del JSON concede acceso. Ese es el punto que esta simulación
   debe preservar para que la interfaz no aprenda un hábito inseguro.

   No hace red. No lee ni escribe SharePoint. No conoce ninguna URL.
   ================================================================ */
(function (global) {
  "use strict";

  var C = global.ATCMisFoliosContratos;
  var SEMILLA = global.ATCMisFoliosDatosMock;

  function clonar(objeto) {
    return JSON.parse(JSON.stringify(objeto));
  }

  function normalizarOid(valor) {
    return typeof valor === "string" ? valor.trim().toLowerCase() : "";
  }

  function normalizarFolio(valor) {
    /* El contrato §13.2 marca la normalización definitiva del folio como
       decisión pendiente y prohíbe inventarla. Esta es la mínima que no
       compromete la decisión: recorte y mayúsculas, sin quitar guiones ni
       ceros a la izquierda. Cuando se apruebe la regla real, se cambia
       aquí y en el flujo DEV, no en la interfaz. */
    return typeof valor === "string" ? valor.trim().toUpperCase() : "";
  }

  function ahoraISO(estado) {
    /* Reloj monótono derivado del reloj fijo de la semilla: cada operación
       avanza un segundo. Mantiene las pruebas deterministas y conserva el
       orden real entre eventos consecutivos. */
    estado.tickSegundos += 1;
    return new Date(new Date(SEMILLA.AHORA).getTime() + estado.tickSegundos * 1000).toISOString();
  }

  function error(codigo, extra) {
    var e = new Error(codigo);
    e.esErrorContrato = true;
    e.code = codigo;
    e.estado = C.ERRORES[codigo] ? C.ERRORES[codigo].estado : 500;
    e.fields = extra && extra.fields ? extra.fields : undefined;
    e.detalles = extra && extra.detalles ? extra.detalles : undefined;
    return e;
  }

  function crearEstado() {
    return {
      folios: SEMILLA.construirFolios(),
      comentarios: clonar(SEMILLA.COMENTARIOS),
      evidencias: clonar(SEMILLA.EVIDENCIAS),
      trazabilidad: clonar(SEMILLA.TRAZABILIDAD),
      usuarios: clonar(SEMILLA.USUARIOS),
      /* correlacionId -> { huella, respuesta } para el contrato §24. */
      correlaciones: {},
      secuencias: { comentario: 6000, evidencia: 9500, evento: 7500 },
      tickSegundos: 0,
      sesionOid: null,
      latenciaMs: 0,

      /* Inyección de fallos y demoras para ejercitar la interfaz contra
         condiciones que el mock no produce por sí solo: un servicio lento,
         un 502, un conflicto de correlación. Sin esto, la única forma de
         ver una banda de error sería provocar un error real. */
      simulacion: { latenciaMs: 0, fallos: {} }
    };
  }

  var estado = crearEstado();

  /* ---------- Autorización (simulación del límite confiable) ---------- */

  function usuarioDeSesion() {
    var oid = normalizarOid(estado.sesionOid);
    if (!oid) throw error("AUTH_REQUIRED");

    var coincidencias = estado.usuarios.filter(function (u) {
      return normalizarOid(u.oid) === oid;
    });

    /* Contrato §9: exactamente una coincidencia activa. Cero y múltiples se
       tratan distinto a propósito — múltiples es un defecto del catálogo,
       no del usuario, y por eso devuelve 503 y no 403. */
    if (coincidencias.length === 0) throw error("USER_NOT_AUTHORIZED");
    if (coincidencias.length > 1) throw error("CATALOG_INTEGRITY_ERROR");
    if (!coincidencias[0].activo) throw error("USER_NOT_AUTHORIZED");

    return coincidencias[0];
  }

  function esSupervisor(usuario) {
    return usuario.rolFuncional === C.PERFILES.GERENCIA ||
           usuario.rolFuncional === C.PERFILES.DIRECCION;
  }

  function esPropio(folio, usuario) {
    var asignado = normalizarOid(folio.responsableAsignadoOid);
    /* Sin responsable no hay propiedad. No se deduce de nombre ni correo. */
    return asignado !== "" && asignado === normalizarOid(usuario.oid);
  }

  function buscarFolio(folioItemId) {
    for (var i = 0; i < estado.folios.length; i++) {
      if (estado.folios[i].folioItemId === folioItemId) return estado.folios[i];
    }
    return null;
  }

  /* Devuelve el folio solo si el actor puede verlo. Coordinación que pide un
     folio ajeno recibe NOT_OWNER y no FOLIO_NOT_FOUND: el contrato §8 asigna
     NOT_FOUND a "no existe o no es visible", pero distinguirlos aquí evita
     que la interfaz diga "no existe" sobre algo que sí existe. */
  function folioAccesible(folioItemId, usuario) {
    var folio = buscarFolio(folioItemId);
    if (!folio) throw error("FOLIO_NOT_FOUND");
    if (!esSupervisor(usuario) && !esPropio(folio, usuario)) throw error("NOT_OWNER");
    return folio;
  }

  /* ---------- Capacidades calculadas por el servicio ---------- */

  function calcularCapacidades(folio, usuario) {
    var abierto = folio.estatusInterno === C.ESTATUS.ABIERTO;
    var supervisor = esSupervisor(usuario);
    var puedeOperar = supervisor || esPropio(folio, usuario);

    return {
      puedeEditar: puedeOperar && abierto,
      puedeCerrar: puedeOperar && folio.estatusInterno === C.ESTATUS.ABIERTO,
      puedeCancelar: puedeOperar && folio.estatusInterno === C.ESTATUS.ABIERTO,
      /* Contrato §15.4: Coordinación nunca reabre un Cancelado. */
      puedeReabrir: puedeOperar && (
        folio.estatusInterno === C.ESTATUS.CERRADO ||
        (folio.estatusInterno === C.ESTATUS.CANCELADO && supervisor)
      ),
      puedeReasignar: puedeOperar && abierto,
      puedeComentar: puedeOperar && abierto,
      puedeCargarEvidencia: puedeOperar && abierto,
      puedeVerTrazabilidad: supervisor
    };
  }

  /* ---------- Concurrencia e idempotencia ---------- */

  function exigirEtag(folio, etagRecibido) {
    if (etagRecibido === undefined || etagRecibido === null || etagRecibido === "") {
      throw error("ETAG_REQUIRED");
    }
    if (etagRecibido !== folio.etag) throw error("ETAG_MISMATCH");
  }

  function siguienteEtag(folio) {
    var numero = parseInt(String(folio.etag).replace(/[^0-9]/g, ""), 10);
    return '"' + (isNaN(numero) ? 1 : numero + 1) + '"';
  }

  function huellaSolicitud(sobre) {
    return JSON.stringify({
      operacion: sobre.operacion,
      folioItemId: sobre.folioItemId === undefined ? null : sobre.folioItemId,
      payload: sobre.payload === undefined ? null : sobre.payload
    });
  }

  /* Contrato §24.2: misma correlación y mismo cuerpo devuelve el resultado
     previo; misma correlación con cuerpo distinto es CORRELATION_CONFLICT. */
  function revisarCorrelacion(sobre) {
    var registrada = estado.correlaciones[sobre.correlacionId];
    if (!registrada) return null;
    if (registrada.huella !== huellaSolicitud(sobre)) throw error("CORRELATION_CONFLICT");
    return registrada.respuesta;
  }

  function registrarCorrelacion(sobre, respuesta) {
    estado.correlaciones[sobre.correlacionId] = {
      huella: huellaSolicitud(sobre),
      respuesta: clonar(respuesta)
    };
  }

  function aplicarMetadatos(folio, accion, correlacionId) {
    folio.etag = siguienteEtag(folio);
    folio.versionNegocio += 1;
    folio.ultimaAccion = accion;
    folio.ultimaFechaModificacion = ahoraISO(estado);
    folio.ultimaCorrelacionId = correlacionId;
    folio.origenUltimaOperacion = "MIS_FOLIOS";
  }

  function registrarEvento(folio, tipoEvento, usuario, extra) {
    estado.secuencias.evento += 1;
    estado.trazabilidad.push({
      eventoId: estado.secuencias.evento,
      folioItemId: folio.folioItemId,
      tipoEvento: tipoEvento,
      actorPersona: usuario.nombreVisible,
      fechaEvento: ahoraISO(estado),
      estadoAnterior: (extra && extra.estadoAnterior) || "",
      estadoNuevo: (extra && extra.estadoNuevo) || "",
      camposModificados: (extra && extra.camposModificados) || "",
      motivo: (extra && extra.motivo) || ""
    });
  }

  /* ---------- Validaciones cruzadas (contrato §14.5) ---------- */

  function validarCruzadas(propuesto) {
    var problemas = [];

    if (propuesto.Implicacion === "Ninguna") {
      if (propuesto.Cargo_Persona_Implicada) problemas.push("Cargo_Persona_Implicada");
      if (propuesto.Partida_Subgrupo) problemas.push("Partida_Subgrupo");
    }

    if (propuesto.Se_Realizo_Accion_Correctiva === "Aplica" && !String(propuesto.Accion_Correctiva_Detalle || "").trim()) {
      problemas.push("Accion_Correctiva_Detalle");
    }
    if (propuesto.Se_Realizo_Accion_Correctiva === "No aplica" && propuesto.Accion_Correctiva_Detalle) {
      problemas.push("Accion_Correctiva_Detalle");
    }

    if (propuesto.Tiene_Impacto_Economico !== "Sí" && propuesto.Impacto_Economico) {
      problemas.push("Impacto_Economico");
    }

    [
      ["Solicitud_Relacionada", "Solicitud_Relacionada_Otro"],
      ["Quien_Activa", "Quien_Activa_Otro"],
      ["Contratante", "Contratante_Otro"],
      ["Tipo_Activacion_Interna", "Tipo_Activacion_Interna_Otro"]
    ].forEach(function (par) {
      var base = String(propuesto[par[0]] || "");
      var esOtro = base === "Otro" || base === "Otra";
      if (!esOtro && propuesto[par[1]]) problemas.push(par[1]);
      if (esOtro && !String(propuesto[par[1]] || "").trim()) problemas.push(par[1]);
    });

    if (problemas.length) throw error("VALIDATION_ERROR", { fields: problemas });
  }

  /* ---------- Consultas ---------- */

  function proyectarResumen(folio) {
    return {
      folioItemId: folio.folioItemId,
      folio: folio.folio,
      tipoGestion: folio.tipoGestion,
      tipoTramite: folio.tipoTramite,
      tipoAtencion: folio.tipoAtencion,
      estatusInterno: folio.estatusInterno,
      prioridadAtencion: folio.prioridadAtencion,
      fechaRecepcionATC: folio.fechaRecepcionATC,
      responsableAsignadoPersona: folio.responsableAsignadoPersona,
      ultimaAccion: folio.ultimaAccion,
      ultimaFechaModificacion: folio.ultimaFechaModificacion,
      etag: folio.etag,
      versionNegocio: folio.versionNegocio
    };
  }

  function dentroDeVentana(folio, ventana) {
    if (ventana !== C.VENTANAS.DOCE_MESES) return true;
    var limite = new Date(SEMILLA.AHORA).getTime() - 365 * 86400000;
    return new Date(folio.fechaRecepcionATC).getTime() >= limite;
  }

  function coincideFiltro(folio, filtros) {
    function enLista(lista, valor) {
      return !lista || lista.length === 0 || lista.indexOf(valor) !== -1;
    }

    if (!dentroDeVentana(folio, filtros.ventana)) return false;
    if (!enLista(filtros.estatus, folio.estatusInterno)) return false;
    if (!enLista(filtros.tipoGestion, folio.tipoGestion)) return false;
    if (!enLista(filtros.tipoTramite, folio.tipoTramite)) return false;
    if (!enLista(filtros.tipoAtencion, folio.tipoAtencion)) return false;
    if (!enLista(filtros.prioridad, folio.prioridadAtencion)) return false;

    if (filtros.folio) {
      if (normalizarFolio(folio.folio).indexOf(normalizarFolio(filtros.folio)) === -1) return false;
    }
    if (filtros.desde && new Date(folio.fechaRecepcionATC) < new Date(filtros.desde)) return false;
    if (filtros.hasta && new Date(folio.fechaRecepcionATC) > new Date(filtros.hasta)) return false;

    return true;
  }

  function consultar(sobre, forzarPropiedad, usuario) {
    var filtros = sobre.payload || {};
    var tamano = Math.min(filtros.paginaTamano || C.PAGINA.TAMANO_PREDETERMINADO, C.PAGINA.TAMANO_MAXIMO);
    var desplazamiento = parseInt(filtros.cursor, 10);
    if (isNaN(desplazamiento) || desplazamiento < 0) desplazamiento = 0;

    var visibles = estado.folios.filter(function (f) {
      if (forzarPropiedad && !esPropio(f, usuario)) return false;
      return coincideFiltro(f, filtros);
    });

    visibles.sort(function (a, b) {
      return new Date(b.fechaRecepcionATC) - new Date(a.fechaRecepcionATC);
    });

    var pagina = visibles.slice(desplazamiento, desplazamiento + tamano);
    var siguiente = desplazamiento + tamano < visibles.length ? String(desplazamiento + tamano) : null;

    return {
      items: pagina.map(proyectarResumen),
      siguienteCursor: siguiente,
      total: visibles.length
    };
  }

  /* ---------- Despacho de operaciones ---------- */

  var MANEJADORES = {};

  MANEJADORES[C.OPERACIONES.CONSULTAR_MIS_FOLIOS] = function (sobre, usuario) {
    return consultar(sobre, true, usuario);
  };

  MANEJADORES[C.OPERACIONES.CONSULTAR_TODOS_FOLIOS] = function (sobre, usuario) {
    if (!esSupervisor(usuario)) throw error("ROLE_NOT_ALLOWED");
    return consultar(sobre, false, usuario);
  };

  MANEJADORES[C.OPERACIONES.OBTENER_FOLIO] = function (sobre, usuario) {
    var folio = folioAccesible(sobre.folioItemId, usuario);
    var opciones = sobre.payload || {};
    var capacidades = calcularCapacidades(folio, usuario);

    var datos = {
      folio: clonar(folio),
      capacidades: capacidades,
      comentarios: [],
      evidencias: [],
      trazabilidad: []
    };

    /* El oid del responsable no viaja al cliente: el modelo físico §18.8
       lo excluye de salidas generales. La interfaz usa la representación
       visible y las capacidades, nunca el identificador técnico. */
    delete datos.folio.responsableAsignadoOid;

    if (opciones.incluirComentarios !== false) {
      datos.comentarios = estado.comentarios
        .filter(function (c) { return c.folioItemId === folio.folioItemId; })
        .map(function (c) {
          var visible = clonar(c);
          delete visible.autorOid;
          return visible;
        });
    }

    if (opciones.incluirEvidencias !== false) {
      datos.evidencias = estado.evidencias.filter(function (e) {
        return e.folioItemId === folio.folioItemId;
      }).map(clonar);
    }

    /* Trazabilidad solo bajo petición explícita y solo para supervisión. */
    if (opciones.incluirTrazabilidad === true) {
      if (!capacidades.puedeVerTrazabilidad) throw error("ROLE_NOT_ALLOWED");
      datos.trazabilidad = estado.trazabilidad.filter(function (t) {
        return t.folioItemId === folio.folioItemId;
      }).map(clonar);
    }

    return { datos: datos, etag: folio.etag, versionNegocio: folio.versionNegocio };
  };

  MANEJADORES[C.OPERACIONES.VALIDAR_DUPLICADO] = function (sobre) {
    var p = sobre.payload || {};
    var coincidencias = estado.folios.filter(function (f) {
      if (p.excluirFolioItemId && f.folioItemId === p.excluirFolioItemId) return false;
      return f.tipoGestion === p.tipoGestion &&
             normalizarFolio(f.folio) === normalizarFolio(p.folio) &&
             f.tipoAtencion === p.tipoAtencion;
    });

    return {
      esDuplicado: coincidencias.length > 0,
      coincidencias: coincidencias.map(function (f) {
        return {
          folioItemId: f.folioItemId,
          folio: f.folio,
          tipoAtencion: f.tipoAtencion,
          estatusInterno: f.estatusInterno
        };
      }),
      /* Decisión pendiente 5 del contrato §31: si los duplicados bloquean o
         solo advierten. Hasta que se apruebe, advierten. */
      resolucionRequerida: coincidencias.length > 0
    };
  };

  MANEJADORES[C.OPERACIONES.EDITAR_FOLIO] = function (sobre, usuario) {
    var folio = folioAccesible(sobre.folioItemId, usuario);
    var cambios = (sobre.payload || {}).cambios;

    if (!cambios || typeof cambios !== "object" || Object.keys(cambios).length === 0) {
      throw error("VALIDATION_ERROR", { fields: ["cambios"] });
    }

    /* La allowlist se revisa antes que el ETag y antes que el estado: el
       contrato §4.2 exige que un campo no autorizado invalide la solicitud
       completa, sin efectos parciales de ningún tipo. */
    var noPermitidos = Object.keys(cambios).filter(function (k) {
      return !C.esCampoEditable(k);
    });
    if (noPermitidos.length) throw error("FIELD_NOT_ALLOWED", { fields: noPermitidos });

    if (folio.estatusInterno !== C.ESTATUS.ABIERTO) throw error("INVALID_STATE_TRANSITION");
    exigirEtag(folio, sobre.etag);

    /* Se valida el resultado de aplicar los cambios, no los cambios sueltos:
       una regla cruzada puede cumplirse con el valor que ya está guardado. */
    var propuesto = clonar(folio);
    Object.keys(cambios).forEach(function (k) { propuesto[k] = cambios[k]; });
    validarCruzadas(propuesto);

    Object.keys(cambios).forEach(function (k) { folio[k] = cambios[k]; });
    aplicarMetadatos(folio, "EDICION", sobre.correlacionId);
    registrarEvento(folio, "EDICION", usuario, {
      estadoAnterior: folio.estatusInterno,
      estadoNuevo: folio.estatusInterno,
      camposModificados: Object.keys(cambios).join(", ")
    });

    return { datos: { camposActualizados: Object.keys(cambios) }, etag: folio.etag, versionNegocio: folio.versionNegocio };
  };

  MANEJADORES[C.OPERACIONES.CAMBIAR_ESTATUS] = function (sobre, usuario) {
    var folio = folioAccesible(sobre.folioItemId, usuario);
    var p = sobre.payload || {};
    var transicion = C.buscarTransicion(folio.estatusInterno, p.accion);

    if (!p.accion || !C.ACCIONES_ESTATUS[p.accion]) throw error("INVALID_OPERATION");
    if (!transicion) throw error("INVALID_STATE_TRANSITION");

    if (p.accion === C.ACCIONES_ESTATUS.REABRIR &&
        folio.estatusInterno === C.ESTATUS.CANCELADO &&
        !esSupervisor(usuario)) {
      throw error("ROLE_NOT_ALLOWED");
    }

    if (transicion.motivo && !String(p.motivo || "").trim()) throw error("MOTIVE_REQUIRED");
    exigirEtag(folio, sobre.etag);

    var anterior = folio.estatusInterno;
    folio.estatusInterno = transicion.destino;
    aplicarMetadatos(folio, p.accion === "CERRAR" ? "CIERRE" : p.accion === "CANCELAR" ? "CANCELACION" : "REAPERTURA", sobre.correlacionId);
    registrarEvento(folio, p.accion === "CERRAR" ? "CIERRE" : p.accion === "CANCELAR" ? "CANCELACION" : "REAPERTURA", usuario, {
      estadoAnterior: anterior,
      estadoNuevo: folio.estatusInterno,
      motivo: String(p.motivo || "").trim()
    });

    return { datos: { estatusInterno: folio.estatusInterno }, etag: folio.etag, versionNegocio: folio.versionNegocio };
  };

  MANEJADORES[C.OPERACIONES.REASIGNAR_FOLIO] = function (sobre, usuario) {
    var folio = folioAccesible(sobre.folioItemId, usuario);
    var p = sobre.payload || {};

    if (folio.estatusInterno !== C.ESTATUS.ABIERTO) throw error("INVALID_STATE_TRANSITION");
    if (!String(p.motivo || "").trim()) throw error("MOTIVE_REQUIRED");

    var destinos = estado.usuarios.filter(function (u) {
      return normalizarOid(u.oid) === normalizarOid(p.responsableNuevoOid);
    });
    if (destinos.length === 0) throw error("VALIDATION_ERROR", { fields: ["responsableNuevoOid"] });
    if (destinos.length > 1) throw error("CATALOG_INTEGRITY_ERROR");
    if (!destinos[0].activo) throw error("VALIDATION_ERROR", { fields: ["responsableNuevoOid"] });

    /* Contrato §16.2: reasignar al mismo responsable es una operación sin
       cambio y se rechaza — no se acepta en silencio. */
    if (normalizarOid(folio.responsableAsignadoOid) === normalizarOid(p.responsableNuevoOid)) {
      throw error("VALIDATION_ERROR", { fields: ["responsableNuevoOid"] });
    }

    exigirEtag(folio, sobre.etag);

    var anteriorPersona = folio.responsableAsignadoPersona;
    folio.responsableAsignadoOid = destinos[0].oid;
    folio.responsableAsignadoPersona = destinos[0].nombreVisible;
    folio.fechaAsignacion = ahoraISO(estado);
    folio.asignadoPorOid = usuario.oid;
    aplicarMetadatos(folio, "REASIGNACION", sobre.correlacionId);
    registrarEvento(folio, "REASIGNACION", usuario, {
      motivo: String(p.motivo).trim(),
      camposModificados: "ResponsableAsignadoOid"
    });

    return {
      datos: { responsableAnteriorPersona: anteriorPersona, responsableNuevoPersona: destinos[0].nombreVisible },
      etag: folio.etag,
      versionNegocio: folio.versionNegocio
    };
  };

  MANEJADORES[C.OPERACIONES.AGREGAR_COMENTARIO] = function (sobre, usuario) {
    var folio = folioAccesible(sobre.folioItemId, usuario);
    var p = sobre.payload || {};
    var texto = String(p.comentario || "").trim();

    if (folio.estatusInterno !== C.ESTATUS.ABIERTO) throw error("INVALID_STATE_TRANSITION");
    if (!texto) throw error("VALIDATION_ERROR", { fields: ["comentario"] });

    estado.secuencias.comentario += 1;
    var nuevo = {
      comentarioId: estado.secuencias.comentario,
      folioItemId: folio.folioItemId,
      comentario: texto,
      autorOid: usuario.oid,
      autorPersona: usuario.nombreVisible,
      fechaComentario: ahoraISO(estado),
      comentarioReferenciadoId: p.comentarioReferenciadoId || null
    };
    estado.comentarios.push(nuevo);
    registrarEvento(folio, "COMENTARIO_AGREGADO", usuario, {});

    /* El contrato §17.3 permite omitir en el MVP la actualización de
       UltimaAccion en la lista principal para reducir conflictos de ETag.
       Se omite: el folio no cambia de versión al comentar. */
    return { datos: { comentarioId: nuevo.comentarioId, fechaComentario: nuevo.fechaComentario } };
  };

  MANEJADORES[C.OPERACIONES.LISTAR_COMENTARIOS] = function (sobre, usuario) {
    var folio = folioAccesible(sobre.folioItemId, usuario);
    var orden = (sobre.payload || {}).orden === "DESC" ? -1 : 1;

    var lista = estado.comentarios
      .filter(function (c) { return c.folioItemId === folio.folioItemId; })
      .map(function (c) { var v = clonar(c); delete v.autorOid; return v; })
      .sort(function (a, b) { return orden * (new Date(a.fechaComentario) - new Date(b.fechaComentario)); });

    return { datos: { comentarios: lista } };
  };

  function validarArchivo(nombreArchivo) {
    var nombre = String(nombreArchivo || "").trim();
    if (!nombre) throw error("VALIDATION_ERROR", { fields: ["nombreArchivo"] });

    /* Nombre seguro (contrato §19.4): sin separadores de ruta ni recorridos.
       No sustituye la validación del servidor, la anticipa. */
    if (/[\\/]|\.\./.test(nombre)) throw error("VALIDATION_ERROR", { fields: ["nombreArchivo"] });

    var partes = nombre.split(".");
    var extension = partes.length > 1 ? partes.pop().toLowerCase() : "";
    if (C.EXTENSIONES_EVIDENCIA.indexOf(extension) === -1) {
      throw error("VALIDATION_ERROR", { fields: ["nombreArchivo"] });
    }
    return nombre;
  }

  MANEJADORES[C.OPERACIONES.CARGAR_EVIDENCIA] = function (sobre, usuario) {
    var folio = folioAccesible(sobre.folioItemId, usuario);
    var p = sobre.payload || {};

    if (folio.estatusInterno !== C.ESTATUS.ABIERTO) throw error("INVALID_STATE_TRANSITION");
    var nombre = validarArchivo(p.nombreArchivo);

    estado.secuencias.evidencia += 1;
    var nueva = {
      evidenciaItemId: estado.secuencias.evidencia,
      folioItemId: folio.folioItemId,
      nombreArchivo: nombre,
      estadoEvidencia: C.ESTADOS_EVIDENCIA.VIGENTE,
      fechaCarga: ahoraISO(estado),
      autorPersona: usuario.nombreVisible,
      evidenciaAnteriorId: null,
      evidenciaSustitutaId: null,
      motivoOperacion: ""
    };
    estado.evidencias.push(nueva);
    registrarEvento(folio, "EVIDENCIA_CARGADA", usuario, {});

    return { datos: { evidenciaItemId: nueva.evidenciaItemId, nombreArchivo: nueva.nombreArchivo } };
  };

  function evidenciaDelFolio(evidenciaItemId, folioItemId) {
    for (var i = 0; i < estado.evidencias.length; i++) {
      if (estado.evidencias[i].evidenciaItemId === evidenciaItemId &&
          estado.evidencias[i].folioItemId === folioItemId) {
        return estado.evidencias[i];
      }
    }
    throw error("EVIDENCE_NOT_FOUND");
  }

  MANEJADORES[C.OPERACIONES.INVALIDAR_EVIDENCIA] = function (sobre, usuario) {
    var folio = folioAccesible(sobre.folioItemId, usuario);
    var p = sobre.payload || {};
    var evidencia = evidenciaDelFolio(p.evidenciaItemId, folio.folioItemId);

    if (evidencia.estadoEvidencia !== C.ESTADOS_EVIDENCIA.VIGENTE) throw error("VALIDATION_ERROR", { fields: ["evidenciaItemId"] });
    if (!String(p.motivo || "").trim()) throw error("MOTIVE_REQUIRED");

    evidencia.estadoEvidencia = C.ESTADOS_EVIDENCIA.INVALIDA;
    evidencia.motivoOperacion = String(p.motivo).trim();
    evidencia.fechaOperacion = ahoraISO(estado);
    registrarEvento(folio, "EVIDENCIA_INVALIDADA", usuario, { motivo: evidencia.motivoOperacion });

    return { datos: { evidenciaItemId: evidencia.evidenciaItemId, estadoEvidencia: evidencia.estadoEvidencia } };
  };

  MANEJADORES[C.OPERACIONES.SUSTITUIR_EVIDENCIA] = function (sobre, usuario) {
    var folio = folioAccesible(sobre.folioItemId, usuario);
    var p = sobre.payload || {};
    var anterior = evidenciaDelFolio(p.evidenciaAnteriorItemId, folio.folioItemId);

    if (anterior.estadoEvidencia !== C.ESTADOS_EVIDENCIA.VIGENTE) throw error("VALIDATION_ERROR", { fields: ["evidenciaAnteriorItemId"] });
    if (!String(p.motivo || "").trim()) throw error("MOTIVE_REQUIRED");

    /* El nombre se valida antes de tocar la evidencia anterior. Contrato
       §21.2: si falla la creación de la sustituta, la anterior permanece
       Vigente. Validar primero es lo que hace cierta esa garantía. */
    var nombre = validarArchivo((p.nuevaEvidencia || {}).nombreArchivo);

    estado.secuencias.evidencia += 1;
    var nueva = {
      evidenciaItemId: estado.secuencias.evidencia,
      folioItemId: folio.folioItemId,
      nombreArchivo: nombre,
      estadoEvidencia: C.ESTADOS_EVIDENCIA.VIGENTE,
      fechaCarga: ahoraISO(estado),
      autorPersona: usuario.nombreVisible,
      evidenciaAnteriorId: anterior.evidenciaItemId,
      evidenciaSustitutaId: null,
      motivoOperacion: ""
    };
    estado.evidencias.push(nueva);

    anterior.estadoEvidencia = C.ESTADOS_EVIDENCIA.SUSTITUIDA;
    anterior.evidenciaSustitutaId = nueva.evidenciaItemId;
    anterior.motivoOperacion = String(p.motivo).trim();
    anterior.fechaOperacion = nueva.fechaCarga;

    registrarEvento(folio, "EVIDENCIA_SUSTITUIDA", usuario, { motivo: anterior.motivoOperacion });

    return { datos: { evidenciaAnteriorItemId: anterior.evidenciaItemId, evidenciaNuevaItemId: nueva.evidenciaItemId } };
  };

  MANEJADORES[C.OPERACIONES.LISTAR_EVIDENCIAS] = function (sobre, usuario) {
    var folio = folioAccesible(sobre.folioItemId, usuario);
    var capacidades = calcularCapacidades(folio, usuario);

    var lista = estado.evidencias
      .filter(function (e) { return e.folioItemId === folio.folioItemId; })
      .map(function (e) {
        var v = clonar(e);
        v.capacidades = {
          puedeInvalidar: capacidades.puedeCargarEvidencia && v.estadoEvidencia === C.ESTADOS_EVIDENCIA.VIGENTE,
          puedeSustituir: capacidades.puedeCargarEvidencia && v.estadoEvidencia === C.ESTADOS_EVIDENCIA.VIGENTE,
          /* Contrato §11.5.7 y §20: la eliminación no existe como capacidad. */
          puedeEliminar: false
        };
        return v;
      });

    return { datos: { evidencias: lista } };
  };

  MANEJADORES[C.OPERACIONES.CONSULTAR_USUARIOS_ASIGNABLES] = function (sobre, usuario) {
    if (!usuario) throw error("AUTH_REQUIRED");

    /* Respuesta minimizada del contrato §23.2: solo oid, nombre visible y
       rol. Nada de columnas administrativas del catálogo. */
    var lista = estado.usuarios
      .filter(function (u) { return u.activo; })
      .map(function (u) {
        return { oid: u.oid, nombreVisible: u.nombreVisible, rolFuncional: u.rolFuncional };
      });

    return { datos: { usuarios: lista } };
  };

  /* ---------- Punto de entrada ---------- */

  function ejecutar(sobre) {
    var demora = estado.latenciaMs + (estado.simulacion.latenciaMs || 0);
    return new Promise(function (resolver) {
      setTimeout(function () { resolver(despachar(sobre)); }, demora);
    });
  }

  /* Devuelve el código a forzar para esta operación, si hay uno armado.
     Los fallos con `veces` finito se consumen; los que se declaran sin
     `veces` persisten hasta que se limpien. */
  function falloArmado(operacion) {
    var armado = estado.simulacion.fallos[operacion] || estado.simulacion.fallos["*"];
    if (!armado) return null;

    if (typeof armado.veces === "number") {
      if (armado.veces <= 0) return null;
      armado.veces -= 1;
    }
    return armado.code;
  }

  function despachar(sobre) {
    var respuestaBase = {
      status: "ok",
      operacion: sobre && sobre.operacion,
      folioItemId: sobre && sobre.folioItemId !== undefined ? sobre.folioItemId : null,
      correlacionId: sobre && sobre.correlacionId
    };

    try {
      if (!sobre || !sobre.operacion) throw error("INVALID_OPERATION");
      if (!MANEJADORES[sobre.operacion]) throw error("INVALID_OPERATION");
      if (!sobre.correlacionId) throw error("VALIDATION_ERROR", { fields: ["correlacionId"] });

      /* El fallo inyectado se evalúa antes de la idempotencia y de la
         autorización: representa una caída del servicio, no una decisión
         de negocio, y por tanto no debe registrar correlación. */
      var forzado = falloArmado(sobre.operacion);
      if (forzado) throw error(forzado);

      var previa = revisarCorrelacion(sobre);
      if (previa) return previa;

      var usuario = usuarioDeSesion();
      var resultado = MANEJADORES[sobre.operacion](sobre, usuario);

      var respuesta = Object.assign({}, respuestaBase, {
        fechaServidor: ahoraISO(estado),
        datos: resultado.datos !== undefined ? resultado.datos : resultado
      });
      if (resultado.etag) respuesta.etag = resultado.etag;
      if (resultado.versionNegocio) respuesta.versionNegocio = resultado.versionNegocio;

      registrarCorrelacion(sobre, respuesta);
      return respuesta;
    } catch (e) {
      if (!e.esErrorContrato) {
        /* Un fallo inesperado del adaptador se presenta como UPSTREAM_ERROR
           sin filtrar el mensaje interno, igual que haría el servicio. */
        return Object.assign({}, respuestaBase, {
          status: "error",
          error: { code: "UPSTREAM_ERROR", message: C.MENSAJES_ERROR.UPSTREAM_ERROR, retryable: true }
        });
      }
      var cuerpo = {
        code: e.code,
        message: C.MENSAJES_ERROR[e.code] || "No fue posible completar la operación.",
        retryable: C.ERRORES[e.code] ? C.ERRORES[e.code].reintentable : false
      };
      if (e.fields) cuerpo.fields = e.fields;
      return Object.assign({}, respuestaBase, { status: "error", error: cuerpo });
    }
  }

  global.ATCMisFoliosAdaptadorMock = Object.freeze({
    nombre: "mock",

    /* Marca que el selector usa para impedir que este adaptador se active
       bajo `environment: "dev"`. Sin ella, un respaldo simulado podría
       colarse y presentar datos fabricados como reales. */
    esSimulado: true,

    inicializar: function (opciones) {
      var simulacionPrevia = estado ? estado.simulacion : null;
      estado = crearEstado();
      estado.sesionOid = (opciones && opciones.sesionOid) || null;
      estado.latenciaMs = (opciones && opciones.latenciaMs) || 0;
      /* La simulación de fallos sobrevive al reinicio: quien la armó desde
         el arnés espera que siga vigente al cambiar de perfil. */
      if (simulacionPrevia) estado.simulacion = simulacionPrevia;
      return Promise.resolve();
    },

    ejecutar: ejecutar,

    /* Control de demora y fallos. Existe para ejercitar la interfaz, no
       para producción: el adaptador entero es simulado.

         simular({ latenciaMs: 1200 })
         simular({ fallos: { EDITAR_FOLIO: { code: "UPSTREAM_ERROR", veces: 1 } } })
         simular({ fallos: { "*": { code: "AUTH_REQUIRED" } } })
         simular(null)   restablece */
    simular: function (opciones) {
      if (!opciones) {
        estado.simulacion = { latenciaMs: 0, fallos: {} };
        return;
      }
      if (typeof opciones.latenciaMs === "number") {
        estado.simulacion.latenciaMs = Math.max(0, opciones.latenciaMs);
      }
      if (opciones.fallos) {
        Object.keys(opciones.fallos).forEach(function (operacion) {
          var declarado = opciones.fallos[operacion];
          var codigo = typeof declarado === "string" ? declarado : declarado.code;
          if (!C.ERRORES[codigo]) {
            throw new Error("Código fuera del catálogo del contrato: " + codigo);
          }
          estado.simulacion.fallos[operacion] = {
            code: codigo,
            veces: typeof declarado.veces === "number" ? declarado.veces : null
          };
        });
      }
    },

    simulacionActiva: function () {
      return {
        latenciaMs: estado.simulacion.latenciaMs,
        operaciones: Object.keys(estado.simulacion.fallos)
      };
    },

    /* Solo para pruebas: permite cambiar de sesión sin recrear el estado y
       ejecutar sin promesa. No lo usa la interfaz. */
    _pruebas: {
      establecerSesion: function (oid) { estado.sesionOid = oid; },
      despachar: despachar,
      obtenerEstado: function () { return estado; },
      reiniciar: function (oid) { estado = crearEstado(); estado.sesionOid = oid || null; }
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
