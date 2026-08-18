/* ================================================================
   Mis Folios — Estado del módulo
   MIS-FOLIOS-CRM-ATC-01 · Fase 2 · Fable 5

   Store mínimo con suscripción. Guarda lo que la interfaz necesita para
   renderizar y nada más: no guarda tokens, ni oid, ni respuestas
   completas del servicio.

   El ETag vive aquí junto al folio abierto porque es el dato que la
   interfaz debe devolver intacto al guardar. No se transforma ni se
   regenera: es opaco (contrato §4.1).
   ================================================================ */
(function (global) {
  "use strict";

  var C = global.ATCMisFoliosContratos;

  function estadoInicial() {
    return {
      vista: "listado",           /* listado | detalle */
      alcance: "MIOS",            /* MIOS | TODOS */
      cargando: false,
      errorGlobal: null,

      filtros: {
        ventana: C.VENTANAS.DOCE_MESES,
        estatus: [],
        tipoGestion: [],
        tipoTramite: [],
        tipoAtencion: [],
        prioridad: [],
        folio: null,
        desde: null,
        hasta: null,
        paginaTamano: C.PAGINA.TAMANO_PREDETERMINADO,
        cursor: null
      },

      listado: { items: [], siguienteCursor: null, total: 0 },

      detalle: {
        folioItemId: null,
        folio: null,
        etag: null,
        versionNegocio: null,
        capacidades: null,
        comentarios: [],
        evidencias: [],
        trazabilidad: []
      },

      edicion: { activa: false, borrador: {}, errores: {}, enviando: false },

      /* Se levanta al recibir ETAG_MISMATCH y solo baja tras recargar el
         folio. Mientras esté arriba, la interfaz bloquea el guardado. */
      conflicto: null,

      usuariosAsignables: [],
      perfilSesion: null
    };
  }

  var estado = estadoInicial();
  var suscriptores = [];

  function obtener() {
    return estado;
  }

  function notificar() {
    suscriptores.forEach(function (cb) {
      try {
        cb(estado);
      } catch (e) {
        /* Un suscriptor roto no debe impedir que los demás se enteren del
           cambio, ni dejar la interfaz a medio pintar. */
        if (global.console && global.console.error) {
          global.console.error("[mis-folios] fallo en suscriptor de estado");
        }
      }
    });
  }

  /* Mezcla superficial por clave de primer nivel. Deliberadamente no es
     recursiva: cada `actualizar` declara el subobjeto completo que cambia,
     lo que hace visible en el código qué se está reemplazando. */
  function actualizar(parcial) {
    Object.keys(parcial).forEach(function (clave) {
      estado[clave] = parcial[clave];
    });
    notificar();
  }

  function suscribir(cb) {
    suscriptores.push(cb);
    return function desuscribir() {
      var i = suscriptores.indexOf(cb);
      if (i !== -1) suscriptores.splice(i, 1);
    };
  }

  function reiniciar() {
    estado = estadoInicial();
    notificar();
  }

  global.ATCMisFoliosEstado = Object.freeze({
    obtener: obtener,
    actualizar: actualizar,
    suscribir: suscribir,
    reiniciar: reiniciar,
    estadoInicial: estadoInicial
  });
})(typeof window !== "undefined" ? window : globalThis);
