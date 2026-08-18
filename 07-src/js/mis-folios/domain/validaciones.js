/* ================================================================
   Mis Folios — Validación previa en cliente
   MIS-FOLIOS-CRM-ATC-01 · Fase 2 · Fable 5

   Estas funciones existen para que el usuario vea el problema antes de
   enviar, no para decidir si la operación procede. La autoridad es el
   servicio: si estas reglas y las del servicio discrepan, gana el
   servicio y la interfaz muestra su error.

   Ninguna función de este archivo concede permisos ni calcula rol.
   ================================================================ */
(function (global) {
  "use strict";

  var C = global.ATCMisFoliosContratos;

  function texto(valor) {
    return valor === null || valor === undefined ? "" : String(valor).trim();
  }

  function esOtro(valor) {
    var v = texto(valor);
    return v === "Otro" || v === "Otra";
  }

  var PARES_OTRO = [
    ["Solicitud_Relacionada", "Solicitud_Relacionada_Otro", "Detalle de la solicitud relacionada"],
    ["Quien_Activa", "Quien_Activa_Otro", "Detalle de quién activa"],
    ["Contratante", "Contratante_Otro", "Detalle del contratante"],
    ["Tipo_Activacion_Interna", "Tipo_Activacion_Interna_Otro", "Detalle del tipo de activación interna"]
  ];

  /* Devuelve { campo: mensaje }. Vacío significa que no hay nada que
     corregir del lado del cliente — no que la operación vaya a proceder. */
  function validarEdicion(folioPropuesto) {
    var errores = {};

    if (texto(folioPropuesto.Implicacion) === "Ninguna") {
      if (texto(folioPropuesto.Cargo_Persona_Implicada)) {
        errores.Cargo_Persona_Implicada = "Con Implicación “Ninguna” este campo debe quedar vacío.";
      }
      if (texto(folioPropuesto.Partida_Subgrupo)) {
        errores.Partida_Subgrupo = "Con Implicación “Ninguna” este campo debe quedar vacío.";
      }
    }

    var accion = texto(folioPropuesto.Se_Realizo_Accion_Correctiva);
    if (accion === "Aplica" && !texto(folioPropuesto.Accion_Correctiva_Detalle)) {
      errores.Accion_Correctiva_Detalle = "Describe la acción correctiva realizada.";
    }
    if (accion === "No aplica" && texto(folioPropuesto.Accion_Correctiva_Detalle)) {
      errores.Accion_Correctiva_Detalle = "Con “No aplica” el detalle debe quedar vacío.";
    }

    if (texto(folioPropuesto.Tiene_Impacto_Economico) !== "Sí" && texto(folioPropuesto.Impacto_Economico)) {
      errores.Impacto_Economico = "Sin impacto económico este campo debe quedar vacío.";
    }

    PARES_OTRO.forEach(function (par) {
      var base = folioPropuesto[par[0]];
      var detalle = texto(folioPropuesto[par[1]]);
      if (esOtro(base) && !detalle) {
        errores[par[1]] = "Especifica el detalle porque la selección es “Otro”.";
      }
      if (!esOtro(base) && detalle) {
        errores[par[1]] = "Este detalle solo aplica cuando la selección es “Otro”.";
      }
    });

    return errores;
  }

  /* Calcula los cambios que se enviarán: solo campos de la allowlist cuyo
     valor difiera del original. Un campo intacto se omite, y la omisión
     significa "conservar" (contrato §4.2) — nunca se envía el folio entero. */
  function calcularCambios(original, editado) {
    var cambios = {};

    C.CAMPOS_EDITABLES.forEach(function (campo) {
      if (!Object.prototype.hasOwnProperty.call(editado, campo)) return;

      var antes = original[campo];
      var despues = editado[campo];

      /* null y cadena vacía se consideran el mismo estado "sin valor" para
         decidir si hubo cambio, pero el valor que se envía conserva su
         forma: las fechas opcionales viajan como null y nunca como "". */
      var antesVacio = antes === null || antes === undefined || antes === "";
      var despuesVacio = despues === null || despues === undefined || despues === "";

      if (antesVacio && despuesVacio) return;
      if (String(antes) === String(despues)) return;

      cambios[campo] = despues;
    });

    return cambios;
  }

  /* Limpieza de dependientes: cuando el campo rector deja de exigir su
     detalle, el detalle se envía explícitamente vacío en la misma
     actualización (contrato §14.5, modelo físico §7.4). Sin esto, la
     omisión conservaría el valor obsoleto. */
  function aplicarLimpiezaDependiente(editado) {
    var resultado = Object.assign({}, editado);

    if (texto(resultado.Implicacion) === "Ninguna") {
      resultado.Cargo_Persona_Implicada = "";
      resultado.Partida_Subgrupo = "";
    }
    if (texto(resultado.Se_Realizo_Accion_Correctiva) === "No aplica") {
      resultado.Accion_Correctiva_Detalle = "";
    }
    if (texto(resultado.Tiene_Impacto_Economico) !== "Sí") {
      resultado.Impacto_Economico = "";
    }
    PARES_OTRO.forEach(function (par) {
      if (!esOtro(resultado[par[0]])) resultado[par[1]] = "";
    });

    /* Fechas opcionales vacías viajan como null (contrato §14.5). */
    ["Fecha_Respuesta_Final", "Fecha_Activacion_Area", "Fecha_Respuesta_Area_Interna"].forEach(function (campo) {
      if (Object.prototype.hasOwnProperty.call(resultado, campo) && !texto(resultado[campo])) {
        resultado[campo] = null;
      }
    });

    return resultado;
  }

  function validarMotivo(motivo) {
    return texto(motivo) ? null : "Escribe el motivo para continuar.";
  }

  function validarComentario(comentario) {
    return texto(comentario) ? null : "El comentario no puede quedar vacío.";
  }

  function validarNombreArchivo(nombre) {
    var limpio = texto(nombre);
    if (!limpio) return "Selecciona un archivo.";
    if (/[\\/]|\.\./.test(limpio)) return "El nombre del archivo no es válido.";

    var partes = limpio.split(".");
    var extension = partes.length > 1 ? partes.pop().toLowerCase() : "";
    if (C.EXTENSIONES_EVIDENCIA.indexOf(extension) === -1) {
      return "Formato no permitido. Se aceptan: " + C.EXTENSIONES_EVIDENCIA.join(", ") + ".";
    }
    return null;
  }

  global.ATCMisFoliosValidaciones = Object.freeze({
    validarEdicion: validarEdicion,
    calcularCambios: calcularCambios,
    aplicarLimpiezaDependiente: aplicarLimpiezaDependiente,
    validarMotivo: validarMotivo,
    validarComentario: validarComentario,
    validarNombreArchivo: validarNombreArchivo,
    PARES_OTRO: PARES_OTRO
  });
})(typeof window !== "undefined" ? window : globalThis);
