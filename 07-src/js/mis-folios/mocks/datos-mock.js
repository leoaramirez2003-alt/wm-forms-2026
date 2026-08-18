/* ================================================================
   Mis Folios — Semilla de datos sintéticos
   MIS-FOLIOS-CRM-ATC-01 · Fase 2 · Fable 5

   Cero PII. Todo identificador sigue el patrón sintético aprobado en
   PLAN_CONSTRUCCION_AMBIENTE_DEV_MIS_FOLIOS.md §6.3: prefijo DEV-,
   personas "PERSONA PRUEBA nn", dominio example.invalid.

   Los oid son UUID versión 4 con estructura visible pero valor
   evidentemente ficticio (bloques 0000/1111/…). No corresponden a
   ninguna cuenta real del tenant.

   La cobertura reproduce la muestra mínima del plan §6.2: cuatro
   campañas, tres estados, cuatro prioridades, folios propios y ajenos,
   con y sin evidencia, Implicación Ninguna y distinta, Acción
   Correctiva Aplica y No aplica, campos "Otro", activación interna,
   coincidencias deliberadas de duplicados y un folio reservado para la
   prueba de concurrencia con dos sesiones.
   ================================================================ */
(function (global) {
  "use strict";

  var USUARIOS = [
    { oid: "00000000-0000-4000-8000-000000000001", nombreVisible: "PERSONA PRUEBA 01", rolFuncional: "COORDINACION", activo: true },
    { oid: "00000000-0000-4000-8000-000000000002", nombreVisible: "PERSONA PRUEBA 02", rolFuncional: "COORDINACION", activo: true },
    { oid: "00000000-0000-4000-8000-000000000003", nombreVisible: "PERSONA PRUEBA 03", rolFuncional: "COORDINACION", activo: true },
    { oid: "00000000-0000-4000-8000-000000000004", nombreVisible: "PERSONA PRUEBA 04", rolFuncional: "GERENCIA",     activo: true },
    { oid: "00000000-0000-4000-8000-000000000005", nombreVisible: "PERSONA PRUEBA 05", rolFuncional: "DIRECCION",    activo: true },
    /* Inactivo a propósito: alimenta el caso 18 del contrato — reasignar a
       un usuario dado de baja debe rechazarse. No aparece en la lista de
       asignables, pero sí existe en el catálogo. */
    { oid: "00000000-0000-4000-8000-000000000006", nombreVisible: "PERSONA PRUEBA 06", rolFuncional: "COORDINACION", activo: false }
  ];

  var CAMPANAS = ["Banorte", "GS Infonavit", "ATF", "Centro Preventivo"];
  var TRAMITES = ["Reembolso", "Programación", "Reporte hospitalario", "Pago directo"];
  var ATENCIONES = ["Queja", "Seguimiento", "Corrección"];
  var PRIORIDADES = ["Baja", "Media", "Alta", "Crítica"];
  var ESTADOS = ["Abierto", "Cerrado", "Cancelado"];

  /* Reloj fijo. Las fechas relativas se calculan desde aquí y no desde
     Date.now(), para que una prueba ejecutada en cualquier día produzca
     exactamente el mismo conjunto. */
  var AHORA = "2026-08-05T12:00:00-06:00";

  function fechaRelativa(diasAtras) {
    var base = new Date(AHORA).getTime();
    return new Date(base - diasAtras * 86400000).toISOString();
  }

  function nuevoFolio(indice) {
    var id = 1000 + indice;
    var campana = CAMPANAS[indice % CAMPANAS.length];
    var atencion = ATENCIONES[indice % ATENCIONES.length];
    var estatus = ESTADOS[indice % ESTADOS.length];
    var responsable = USUARIOS[indice % 5];
    var conImplicacion = indice % 3 === 0;
    var conAccionCorrectiva = indice % 4 === 0;
    var conOtro = indice % 7 === 0;
    var conActivacion = indice % 5 === 0;

    return {
      folioItemId: id,
      folio: "DEV-BAN-" + String(indice + 1).padStart(4, "0"),
      tipoGestion: campana,
      tipoTramite: TRAMITES[indice % TRAMITES.length],
      tipoAtencion: atencion,
      estatusInterno: estatus,
      prioridadAtencion: PRIORIDADES[indice % PRIORIDADES.length],
      fechaRecepcionATC: fechaRelativa(indice * 9),
      responsableAsignadoOid: responsable.oid,
      responsableAsignadoPersona: responsable.nombreVisible,
      fechaAsignacion: fechaRelativa(indice * 9),
      ultimaAccion: indice % 2 === 0 ? "EDICION" : "CREACION",
      ultimaFechaModificacion: fechaRelativa(indice),
      etag: '"1"',
      versionNegocio: 1,

      /* Campos no editables que el detalle muestra en solo lectura. */
      correoGestor: "usuario.dev" + String((indice % 5) + 1).padStart(2, "0") + "@example.invalid",
      nombreGestor: USUARIOS[indice % 5].nombreVisible,
      fechaInicio: fechaRelativa(indice * 9),
      fechaFin: fechaRelativa(indice * 9),

      /* Campos operativos editables (allowlist del contrato §14.3). */
      Imputable_Gral: indice % 2 === 0 ? "Sí" : "No",
      Resultado_Queja: atencion === "Queja" ? (indice % 2 === 0 ? "Procede" : "No procede") : "",
      Analisis_Queja: "Analisis sintetico de prueba numero " + (indice + 1) + ". Sin datos reales.",
      Tiene_Impacto_Economico: indice % 6 === 0 ? "Sí" : "No",
      Impacto_Economico: indice % 6 === 0 ? String(1000 + indice * 25) : "",
      Solicitud_Relacionada: conOtro ? "Otro" : "Solicitud VIP",
      Solicitud_Relacionada_Otro: conOtro ? "Detalle sintetico de solicitud" : "",
      Seguimiento_Con: "Coordinación",
      HC: "",
      Quien_Activa: conOtro ? "Otro" : "Cliente",
      Quien_Activa_Otro: conOtro ? "Origen sintetico de activacion" : "",
      Contratante: "Contratante de prueba",
      Contratante_Otro: "",
      Fecha_Respuesta_Final: estatus === "Cerrado" ? fechaRelativa(indice) : null,
      Nombre_Dictaminador: "PERSONA PRUEBA " + String((indice % 5) + 1).padStart(2, "0"),
      Tipo_Condicion: "Condicion sintetica",
      Catalogo: "Catalogo sintetico",
      Es_Error_Analista: indice % 8 === 0 ? "Sí" : "No",
      Implicacion: conImplicacion ? "UNE" : "Ninguna",
      Cargo_Persona_Implicada: conImplicacion ? "Cargo sintetico" : "",
      Partida_Subgrupo: conImplicacion ? "Partida sintetica" : "",
      Cuenta_Con_Pruebas: indice % 2 === 0 ? "Sí" : "No",
      Tipo_Activacion_Interna: conActivacion ? "Area interna" : "",
      Tipo_Activacion_Interna_Otro: "",
      Detalle_Activacion_Interna: conActivacion ? "Detalle sintetico de activacion interna" : "",
      Cuenta_Con_Respuesta_Area_Interna: conActivacion ? "Sí" : "",
      Fecha_Activacion_Area: conActivacion ? fechaRelativa(indice + 3) : null,
      Fecha_Respuesta_Area_Interna: conActivacion ? fechaRelativa(indice + 1) : null,
      Se_Realizo_Accion_Correctiva: conAccionCorrectiva ? "Aplica" : "No aplica",
      Accion_Correctiva_Detalle: conAccionCorrectiva ? "Accion correctiva sintetica documentada" : ""
    };
  }

  function construirFolios() {
    var folios = [];
    var i;

    for (i = 0; i < 36; i++) {
      folios.push(nuevoFolio(i));
    }

    /* Duplicado deliberado: mismo folio y misma atención dentro de la misma
       campaña que el elemento 1000. Alimenta el caso de VALIDAR_DUPLICADO.
       El estado Cancelado es intencional — el contrato §13.2 dice que los
       cancelados participan en la llave de duplicados. */
    var duplicado = nuevoFolio(0);
    duplicado.folioItemId = 1900;
    duplicado.estatusInterno = "Cancelado";
    duplicado.responsableAsignadoOid = USUARIOS[1].oid;
    duplicado.responsableAsignadoPersona = USUARIOS[1].nombreVisible;
    folios.push(duplicado);

    /* Reservado para la prueba de concurrencia: dos sesiones leen ETag "1",
       la primera guarda y la segunda debe recibir ETAG_MISMATCH. */
    var concurrencia = nuevoFolio(1);
    concurrencia.folioItemId = 1901;
    concurrencia.folio = "DEV-BAN-9001";
    concurrencia.estatusInterno = "Abierto";
    concurrencia.responsableAsignadoOid = USUARIOS[0].oid;
    concurrencia.responsableAsignadoPersona = USUARIOS[0].nombreVisible;
    folios.push(concurrencia);

    /* Histórico sin responsable. El contrato §9.2 prohíbe deducir propiedad
       desde nombre o correo, así que este folio no debe ser propio de nadie
       y solo Gerencia y Dirección deben verlo. */
    var sinResponsable = nuevoFolio(2);
    sinResponsable.folioItemId = 1902;
    sinResponsable.folio = "DEV-BAN-9002";
    sinResponsable.responsableAsignadoOid = null;
    sinResponsable.responsableAsignadoPersona = "";
    sinResponsable.fechaAsignacion = null;
    folios.push(sinResponsable);

    return folios;
  }

  var COMENTARIOS = [
    { comentarioId: 5001, folioItemId: 1000, comentario: "Comentario sintetico inicial de la atencion.", autorOid: USUARIOS[0].oid, autorPersona: USUARIOS[0].nombreVisible, fechaComentario: fechaRelativa(4), comentarioReferenciadoId: null },
    { comentarioId: 5002, folioItemId: 1000, comentario: "Correccion del comentario anterior: se ajusta la referencia.", autorOid: USUARIOS[0].oid, autorPersona: USUARIOS[0].nombreVisible, fechaComentario: fechaRelativa(2), comentarioReferenciadoId: 5001 },
    { comentarioId: 5003, folioItemId: 1901, comentario: "Folio reservado para prueba de concurrencia.", autorOid: USUARIOS[3].oid, autorPersona: USUARIOS[3].nombreVisible, fechaComentario: fechaRelativa(1), comentarioReferenciadoId: null }
  ];

  var EVIDENCIAS = [
    { evidenciaItemId: 9001, folioItemId: 1000, nombreArchivo: "DEV-evidencia-01.pdf", estadoEvidencia: "Vigente",    fechaCarga: fechaRelativa(5), autorPersona: USUARIOS[0].nombreVisible, evidenciaAnteriorId: null, evidenciaSustitutaId: null, motivoOperacion: "" },
    { evidenciaItemId: 9002, folioItemId: 1000, nombreArchivo: "DEV-evidencia-02.png", estadoEvidencia: "Sustituida", fechaCarga: fechaRelativa(5), autorPersona: USUARIOS[0].nombreVisible, evidenciaAnteriorId: null, evidenciaSustitutaId: 9003, motivoOperacion: "Se carga version corregida" },
    { evidenciaItemId: 9003, folioItemId: 1000, nombreArchivo: "DEV-evidencia-02-corregida.png", estadoEvidencia: "Vigente", fechaCarga: fechaRelativa(3), autorPersona: USUARIOS[0].nombreVisible, evidenciaAnteriorId: 9002, evidenciaSustitutaId: null, motivoOperacion: "" },
    { evidenciaItemId: 9004, folioItemId: 1001, nombreArchivo: "DEV-evidencia-03.xlsx", estadoEvidencia: "Inválida",  fechaCarga: fechaRelativa(8), autorPersona: USUARIOS[1].nombreVisible, evidenciaAnteriorId: null, evidenciaSustitutaId: null, motivoOperacion: "Documento incorrecto" }
  ];

  var TRAZABILIDAD = [
    { eventoId: 7001, folioItemId: 1000, tipoEvento: "CREACION",  actorPersona: USUARIOS[0].nombreVisible, fechaEvento: fechaRelativa(9),  estadoAnterior: "",        estadoNuevo: "Abierto", camposModificados: "", motivo: "" },
    { eventoId: 7002, folioItemId: 1000, tipoEvento: "EDICION",   actorPersona: USUARIOS[0].nombreVisible, fechaEvento: fechaRelativa(4),  estadoAnterior: "Abierto", estadoNuevo: "Abierto", camposModificados: "Prioridad_Atencion", motivo: "" },
    { eventoId: 7003, folioItemId: 1000, tipoEvento: "COMENTARIO_AGREGADO", actorPersona: USUARIOS[0].nombreVisible, fechaEvento: fechaRelativa(4), estadoAnterior: "", estadoNuevo: "", camposModificados: "", motivo: "" }
  ];

  global.ATCMisFoliosDatosMock = Object.freeze({
    AHORA: AHORA,
    USUARIOS: USUARIOS,
    CAMPANAS: CAMPANAS,
    TRAMITES: TRAMITES,
    ATENCIONES: ATENCIONES,
    PRIORIDADES: PRIORIDADES,
    ESTADOS: ESTADOS,
    construirFolios: construirFolios,
    COMENTARIOS: COMENTARIOS,
    EVIDENCIAS: EVIDENCIAS,
    TRAZABILIDAD: TRAZABILIDAD
  });
})(typeof window !== "undefined" ? window : globalThis);
