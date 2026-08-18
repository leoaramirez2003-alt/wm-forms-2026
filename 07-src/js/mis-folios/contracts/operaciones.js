/* ================================================================
   Mis Folios — Contratos de operaciones (espejo de solo lectura)
   MIS-FOLIOS-CRM-ATC-01 · Fase 2 · Fable 5

   Transcripción literal de CONTRATOS_OPERACIONES_MIS_FOLIOS.md.
   Este archivo NO define reglas: las copia. Si el contrato cambia,
   cambia aquí y en ningún otro punto del módulo.

   Ninguna constante de este archivo concede permisos. La autoridad
   de autorización vive en la capa de operación (servidor), que
   obtiene el oid del token validado. Aquí solo se declara lo que la
   interfaz debe mostrar, habilitar y validar antes de enviar.
   ================================================================ */
(function (global) {
  "use strict";

  var OPERACIONES = Object.freeze({
    CONSULTAR_MIS_FOLIOS: "CONSULTAR_MIS_FOLIOS",
    CONSULTAR_TODOS_FOLIOS: "CONSULTAR_TODOS_FOLIOS",
    OBTENER_FOLIO: "OBTENER_FOLIO",
    VALIDAR_DUPLICADO: "VALIDAR_DUPLICADO",
    EDITAR_FOLIO: "EDITAR_FOLIO",
    CAMBIAR_ESTATUS: "CAMBIAR_ESTATUS",
    REASIGNAR_FOLIO: "REASIGNAR_FOLIO",
    AGREGAR_COMENTARIO: "AGREGAR_COMENTARIO",
    LISTAR_COMENTARIOS: "LISTAR_COMENTARIOS",
    CARGAR_EVIDENCIA: "CARGAR_EVIDENCIA",
    INVALIDAR_EVIDENCIA: "INVALIDAR_EVIDENCIA",
    SUSTITUIR_EVIDENCIA: "SUSTITUIR_EVIDENCIA",
    LISTAR_EVIDENCIAS: "LISTAR_EVIDENCIAS",
    CONSULTAR_USUARIOS_ASIGNABLES: "CONSULTAR_USUARIOS_ASIGNABLES"
  });

  /* Catálogo de errores, sección 8 del contrato. `reintentable` reproduce
     la columna "Reintento"; la interfaz la usa para decidir si ofrece un
     botón de reintento, nunca para reintentar sola. */
  var ERRORES = Object.freeze({
    AUTH_REQUIRED:             { estado: 401, reintentable: false },
    USER_NOT_AUTHORIZED:       { estado: 403, reintentable: false },
    ROLE_NOT_ALLOWED:          { estado: 403, reintentable: false },
    NOT_OWNER:                 { estado: 403, reintentable: false },
    FOLIO_NOT_FOUND:           { estado: 404, reintentable: false },
    INVALID_OPERATION:         { estado: 400, reintentable: false },
    FIELD_NOT_ALLOWED:         { estado: 400, reintentable: false },
    VALIDATION_ERROR:          { estado: 400, reintentable: false },
    MOTIVE_REQUIRED:           { estado: 400, reintentable: false },
    INVALID_STATE_TRANSITION:  { estado: 409, reintentable: false },
    ETAG_REQUIRED:             { estado: 428, reintentable: true },
    ETAG_MISMATCH:             { estado: 412, reintentable: true },
    CORRELATION_CONFLICT:      { estado: 409, reintentable: false },
    DUPLICATE_FOUND:           { estado: 409, reintentable: false },
    CATALOG_INTEGRITY_ERROR:   { estado: 503, reintentable: false },
    EVIDENCE_NOT_FOUND:        { estado: 404, reintentable: false },
    EVIDENCE_DELETE_FORBIDDEN: { estado: 403, reintentable: false },
    COMMENT_IMMUTABLE:         { estado: 403, reintentable: false },
    UPSTREAM_ERROR:            { estado: 502, reintentable: true },
    TRACE_PENDING:             { estado: 202, reintentable: false }
  });

  /* Mensajes que ve el usuario. El contrato prohíbe devolver detalles
     internos; estos textos explican qué pasó y qué hacer, sin exponer
     nombres de listas, conexiones ni rutas. */
  var MENSAJES_ERROR = Object.freeze({
    AUTH_REQUIRED:             "Tu sesión no está activa. Inicia sesión de nuevo para continuar.",
    USER_NOT_AUTHORIZED:       "Tu usuario no está dado de alta en el catálogo de Mis Folios. Solicita el alta a la Coordinación.",
    ROLE_NOT_ALLOWED:          "Tu perfil no permite esta acción.",
    NOT_OWNER:                 "Este folio está asignado a otra persona. Solicita la reasignación para poder operarlo.",
    FOLIO_NOT_FOUND:           "El folio ya no está disponible o no es visible para tu perfil.",
    INVALID_OPERATION:         "La acción solicitada no existe.",
    FIELD_NOT_ALLOWED:         "La solicitud incluye campos que no se pueden modificar desde Mis Folios. No se guardó ningún cambio.",
    VALIDATION_ERROR:          "Revisa los campos marcados: falta información o hay una combinación no permitida.",
    MOTIVE_REQUIRED:           "Escribe el motivo para continuar.",
    INVALID_STATE_TRANSITION:  "El folio ya no está en un estado que permita esta acción. Recarga para ver el estado vigente.",
    ETAG_REQUIRED:             "Recarga el folio antes de guardar: falta la versión de referencia.",
    ETAG_MISMATCH:            "Otra persona modificó este folio mientras lo editabas. Recarga para ver la versión vigente y vuelve a aplicar tus cambios.",
    CORRELATION_CONFLICT:      "Esta operación ya se registró con datos distintos. Recarga antes de intentarlo de nuevo.",
    DUPLICATE_FOUND:           "Ya existe un folio con la misma combinación de folio y tipo de atención en esta campaña.",
    CATALOG_INTEGRITY_ERROR:   "El catálogo de usuarios no está disponible. Reporta la incidencia a la Coordinación.",
    EVIDENCE_NOT_FOUND:        "La evidencia ya no está disponible o no pertenece a este folio.",
    EVIDENCE_DELETE_FORBIDDEN: "Las evidencias no se eliminan. Puedes invalidarlas o sustituirlas.",
    COMMENT_IMMUTABLE:         "Los comentarios no se editan. Agrega uno nuevo para corregir.",
    UPSTREAM_ERROR:            "El servicio no respondió. Intenta de nuevo en unos momentos.",
    TRACE_PENDING:             "La operación se guardó. El registro de trazabilidad quedó pendiente."
  });

  var ESTATUS = Object.freeze({
    ABIERTO: "Abierto",
    CERRADO: "Cerrado",
    CANCELADO: "Cancelado"
  });

  var ACCIONES_ESTATUS = Object.freeze({
    CERRAR: "CERRAR",
    CANCELAR: "CANCELAR",
    REABRIR: "REABRIR"
  });

  var PERFILES = Object.freeze({
    COORDINACION: "COORDINACION",
    GERENCIA: "GERENCIA",
    DIRECCION: "DIRECCION"
  });

  /* Sección 15.3. `motivo` reproduce la columna "Motivo" de la tabla de
     transiciones: cancelar y reabrir lo exigen, cerrar no. */
  var TRANSICIONES = Object.freeze([
    Object.freeze({ origen: ESTATUS.ABIERTO,   accion: ACCIONES_ESTATUS.CERRAR,   destino: ESTATUS.CERRADO,   motivo: false }),
    Object.freeze({ origen: ESTATUS.ABIERTO,   accion: ACCIONES_ESTATUS.CANCELAR, destino: ESTATUS.CANCELADO, motivo: true }),
    Object.freeze({ origen: ESTATUS.CERRADO,   accion: ACCIONES_ESTATUS.REABRIR,  destino: ESTATUS.ABIERTO,   motivo: true }),
    Object.freeze({ origen: ESTATUS.CANCELADO, accion: ACCIONES_ESTATUS.REABRIR,  destino: ESTATUS.ABIERTO,   motivo: true })
  ]);

  function buscarTransicion(origen, accion) {
    for (var i = 0; i < TRANSICIONES.length; i++) {
      if (TRANSICIONES[i].origen === origen && TRANSICIONES[i].accion === accion) {
        return TRANSICIONES[i];
      }
    }
    return null;
  }

  /* Sección 14.3. Congelada: el contrato dice que la allowlist se reduce
     por campaña y reglas condicionales, y que nunca se amplía desde el
     cliente. Cualquier ampliación es un cambio de contrato, no de código. */
  var CAMPOS_EDITABLES = Object.freeze([
    "Imputable_Gral",
    "Resultado_Queja",
    "Analisis_Queja",
    "Tiene_Impacto_Economico",
    "Impacto_Economico",
    "Solicitud_Relacionada",
    "Solicitud_Relacionada_Otro",
    "Seguimiento_Con",
    "Quien_Activa",
    "Quien_Activa_Otro",
    "Contratante",
    "Contratante_Otro",
    "Fecha_Respuesta_Final",
    "Nombre_Dictaminador",
    "Tipo_Condicion",
    "Catalogo",
    "Es_Error_Analista",
    "Implicacion",
    "Cargo_Persona_Implicada",
    "Partida_Subgrupo",
    "Prioridad_Atencion",
    "Cuenta_Con_Pruebas",
    "Tipo_Activacion_Interna",
    "Tipo_Activacion_Interna_Otro",
    "Detalle_Activacion_Interna",
    "Cuenta_Con_Respuesta_Area_Interna",
    "Fecha_Activacion_Area",
    "Fecha_Respuesta_Area_Interna",
    "Se_Realizo_Accion_Correctiva",
    "Accion_Correctiva_Detalle"
  ]);

  /* Sección 14.4. Se declara explícitamente para que la interfaz pueda
     demostrar por qué un campo se muestra en solo lectura, en vez de
     limitarse a omitirlo. */
  var CAMPOS_PROHIBIDOS = Object.freeze([
    "Folio",
    "Tipo_Gestion",
    "Tipo_Tramite",
    "Tipo_Atencion",
    "Fecha_Recepcion_ATC",
    "Correo_Gestor",
    "Nombre_Gestor",
    "Fecha_Inicio",
    "Fecha_Fin",
    "Mes",
    "Duracion_Min",
    "Estatus_Interno"
  ]);

  function esCampoEditable(nombre) {
    return CAMPOS_EDITABLES.indexOf(nombre) !== -1;
  }

  /* Sección 19.3. La extensión es la única comprobación que el cliente
     puede hacer con certeza; el tipo MIME lo declara el navegador y no
     es prueba suficiente. La validación real es del servidor. */
  var EXTENSIONES_EVIDENCIA = Object.freeze(["pdf", "png", "jpg", "jpeg", "msg", "eml", "docx", "xlsx"]);

  var ESTADOS_EVIDENCIA = Object.freeze({
    VIGENTE: "Vigente",
    INVALIDA: "Inválida",
    SUSTITUIDA: "Sustituida"
  });

  var VENTANAS = Object.freeze({ DOCE_MESES: "12M", TODO: "TODO" });

  /* Sección 10.3: "Tamaño máximo de página inicial propuesto: 100." */
  var PAGINA = Object.freeze({ TAMANO_PREDETERMINADO: 50, TAMANO_MAXIMO: 100 });

  global.ATCMisFoliosContratos = Object.freeze({
    OPERACIONES: OPERACIONES,
    ERRORES: ERRORES,
    MENSAJES_ERROR: MENSAJES_ERROR,
    ESTATUS: ESTATUS,
    ACCIONES_ESTATUS: ACCIONES_ESTATUS,
    PERFILES: PERFILES,
    TRANSICIONES: TRANSICIONES,
    buscarTransicion: buscarTransicion,
    CAMPOS_EDITABLES: CAMPOS_EDITABLES,
    CAMPOS_PROHIBIDOS: CAMPOS_PROHIBIDOS,
    esCampoEditable: esCampoEditable,
    EXTENSIONES_EVIDENCIA: EXTENSIONES_EVIDENCIA,
    ESTADOS_EVIDENCIA: ESTADOS_EVIDENCIA,
    VENTANAS: VENTANAS,
    PAGINA: PAGINA
  });
})(typeof window !== "undefined" ? window : globalThis);
