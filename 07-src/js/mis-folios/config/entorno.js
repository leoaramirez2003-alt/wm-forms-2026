/* ================================================================
   Mis Folios — Registro de configuración de entorno
   MIS-FOLIOS-CRM-ATC-01 · Fase 2 · Fable 5

   Única fuente de verdad sobre en qué modo corre el módulo. El selector
   de adaptador lee de aquí; nadie más decide.

   Este archivo NO contiene ninguna URL, recurso, inquilino, token ni
   secreto, y no debe contenerlos nunca. Los campos de destino nacen en
   `null` y solo la misión que conecte DEV los rellenará, con valores
   que tampoco se escriben aquí sino que se inyectan en el arranque.

   ---------------------------------------------------------------
   Regla de cierre por defecto (fail-closed)
   ---------------------------------------------------------------
   Un entorno `dev` mal configurado NO cae al mock. Cae a un error de
   configuración visible. Un respaldo silencioso mostraría datos
   fabricados con apariencia de reales, y una escritura simulada se
   leería como guardada. Es la peor falla posible en este módulo, así
   que se prohíbe estructuralmente:

     - `enableMockFallback` solo puede ser `false` cuando el entorno es
       `dev`; ponerlo en `true` invalida la configuración entera;
     - el selector rechaza activar un adaptador simulado bajo `dev`.
   ================================================================ */
(function (global) {
  "use strict";

  var ENTORNOS = Object.freeze({ MOCK: "mock", DEV: "dev" });

  /* Transportes contemplados. Ninguno está elegido: la decisión entre
     Microsoft Graph y SharePoint REST es un gate técnico abierto
     (CONTRATOS §31.1, MODELO_FISICO §23.1). `pendiente` es el único
     valor legítimo hasta que la autoridad funcional decida. */
  var TRANSPORTES = Object.freeze({
    PENDIENTE: "pendiente",
    SHAREPOINT_REST: "sharepoint-rest",
    GRAPH: "graph"
  });

  function configuracionInicial() {
    return {
      environment: ENTORNOS.MOCK,
      transport: TRANSPORTES.PENDIENTE,

      /* Destino de las operaciones. Ambos nulos a propósito. El adaptador
         DEV nunca los construye ni los adivina: los recibe o falla. */
      baseUrl: null,
      resource: null,

      timeoutMs: 30000,
      defaultPageSize: 50,
      maxPageSize: 100,

      /* Límite de tamaño de evidencia. Nulo porque su aprobación es una
         decisión pendiente del contrato §31.3. Nulo significa "sin
         límite conocido en cliente", no "sin límite". */
      maxEvidenceBytes: null,

      enableMockFallback: false,

      /* Función de transporte inyectada por la misión que conecte DEV.
         Es quien conoce la URL; el adaptador solo le entrega la operación
         lógica. Mientras sea null, `dev` es una configuración inválida. */
      transportFn: null
    };
  }

  var configuracion = configuracionInicial();

  function obtener() {
    /* Copia superficial: nadie muta el registro por referencia. La
       función de transporte se pasa tal cual porque es una función. */
    var copia = {};
    Object.keys(configuracion).forEach(function (clave) {
      copia[clave] = configuracion[clave];
    });
    return copia;
  }

  /* Devuelve la lista de problemas. Vacía significa configuración usable.
     Se devuelven todos y no solo el primero, para que quien conecte DEV
     vea de una vez todo lo que le falta. */
  function problemas(candidata) {
    var c = candidata || configuracion;
    var fallos = [];

    if (c.environment !== ENTORNOS.MOCK && c.environment !== ENTORNOS.DEV) {
      fallos.push("environment debe ser \"mock\" o \"dev\"; se recibió: " + JSON.stringify(c.environment));
    }

    if (typeof c.timeoutMs !== "number" || !isFinite(c.timeoutMs) || c.timeoutMs <= 0) {
      fallos.push("timeoutMs debe ser un número positivo de milisegundos.");
    }

    if (typeof c.defaultPageSize !== "number" || c.defaultPageSize <= 0) {
      fallos.push("defaultPageSize debe ser un número positivo.");
    }

    if (typeof c.maxPageSize !== "number" || c.maxPageSize < c.defaultPageSize) {
      fallos.push("maxPageSize debe ser un número mayor o igual que defaultPageSize.");
    }

    if (c.maxEvidenceBytes !== null && (typeof c.maxEvidenceBytes !== "number" || c.maxEvidenceBytes <= 0)) {
      fallos.push("maxEvidenceBytes debe ser null o un número positivo.");
    }

    if (c.enableMockFallback !== false && c.enableMockFallback !== true) {
      fallos.push("enableMockFallback debe ser booleano.");
    }

    if (c.environment === ENTORNOS.DEV) {
      if (c.enableMockFallback === true) {
        fallos.push(
          "enableMockFallback no puede ser true en entorno dev: un respaldo silencioso " +
          "presentaría datos simulados como reales."
        );
      }

      if (c.transport !== TRANSPORTES.SHAREPOINT_REST && c.transport !== TRANSPORTES.GRAPH) {
        fallos.push(
          "transport sigue en \"" + c.transport + "\". La elección entre SharePoint REST y " +
          "Microsoft Graph es un gate técnico pendiente de aprobación."
        );
      }

      if (typeof c.transportFn !== "function") {
        fallos.push(
          "transportFn no está inyectada. El adaptador DEV no construye destinos: " +
          "la misión que conecte DEV debe proporcionar la función de transporte."
        );
      }

      var destino = c.resource || c.baseUrl;
      if (typeof destino !== "string" || destino.trim() === "") {
        fallos.push("Falta resource o baseUrl. Ninguno se deduce ni se codifica en el módulo.");
      }
    }

    return fallos;
  }

  function esValida(candidata) {
    return problemas(candidata).length === 0;
  }

  /* Aplica cambios de forma atómica: si el resultado no es válido, no se
     aplica nada. Una configuración a medias es peor que ninguna, porque
     deja el módulo en un estado que nadie declaró. */
  function configurar(parcial) {
    var candidata = obtener();

    Object.keys(parcial || {}).forEach(function (clave) {
      if (!Object.prototype.hasOwnProperty.call(candidata, clave)) {
        throw new Error("Clave de configuración desconocida: " + clave);
      }
      candidata[clave] = parcial[clave];
    });

    var fallos = problemas(candidata);
    if (fallos.length) {
      var error = new Error("Configuración de Mis Folios inválida:\n  - " + fallos.join("\n  - "));
      error.esErrorConfiguracion = true;
      error.problemas = fallos;
      throw error;
    }

    configuracion = candidata;
    return obtener();
  }

  function reiniciar() {
    configuracion = configuracionInicial();
    return obtener();
  }

  function esModoSimulado() {
    return configuracion.environment === ENTORNOS.MOCK;
  }

  /* Vista segura para diagnóstico y documentación: nunca expone el
     destino ni la función de transporte. Es lo único que puede pintarse
     en pantalla o escribirse en una evidencia. */
  function resumenSeguro() {
    return {
      environment: configuracion.environment,
      transport: configuracion.transport,
      destinoConfigurado: !!(configuracion.resource || configuracion.baseUrl),
      transporteInyectado: typeof configuracion.transportFn === "function",
      timeoutMs: configuracion.timeoutMs,
      defaultPageSize: configuracion.defaultPageSize,
      maxPageSize: configuracion.maxPageSize,
      maxEvidenceBytes: configuracion.maxEvidenceBytes,
      enableMockFallback: configuracion.enableMockFallback,
      valida: esValida()
    };
  }

  global.ATCMisFoliosConfig = Object.freeze({
    ENTORNOS: ENTORNOS,
    TRANSPORTES: TRANSPORTES,
    obtener: obtener,
    configurar: configurar,
    problemas: problemas,
    esValida: esValida,
    esModoSimulado: esModoSimulado,
    resumenSeguro: resumenSeguro,
    reiniciar: reiniciar
  });
})(typeof window !== "undefined" ? window : globalThis);
