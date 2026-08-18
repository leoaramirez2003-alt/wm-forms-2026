/* ================================================================
   Mis Folios — Componentes de interfaz
   MIS-FOLIOS-CRM-ATC-01 · Fase 2 · Fable 5

   Construcción de DOM por nodo. No hay `innerHTML` en todo el módulo:
   todo texto de origen desconocido entra por `textContent`, que no
   interpreta marcado. Es la garantía estructural de que un análisis de
   queja, un motivo o un nombre de archivo no puedan inyectar HTML.

   La CSP del App Shell declara `style-src 'self'` sin `unsafe-inline`,
   así que aquí no se escriben atributos `style` ni handlers `on*`: todo
   estilo llega por clase y todo evento por addEventListener.

   Accesibilidad (WCAG 2.2 AA) resuelta en este archivo:
     - toda entrada tiene <label> asociada por `for`/`id`;
     - los errores se anuncian con `aria-invalid` + `aria-describedby`;
     - el diálogo atrapa el foco, cierra con Escape y lo devuelve al
       control que lo abrió (2.4.3 Orden del foco, 2.1.2 Sin trampa);
     - los cambios de estado se anuncian por una región `aria-live`;
     - los controles de acción son <button>, nunca <div> con click.
   ================================================================ */
(function (global) {
  "use strict";

  var doc = global.document;

  /* ---------- Construcción ---------- */

  function el(etiqueta, opciones, hijos) {
    var nodo = doc.createElement(etiqueta);
    var config = opciones || {};

    if (config.clase) nodo.className = config.clase;
    if (config.texto !== undefined && config.texto !== null) nodo.textContent = String(config.texto);
    if (config.id) nodo.id = config.id;

    if (config.attrs) {
      Object.keys(config.attrs).forEach(function (nombre) {
        var valor = config.attrs[nombre];
        if (valor === null || valor === undefined || valor === false) return;
        nodo.setAttribute(nombre, valor === true ? "" : String(valor));
      });
    }

    if (config.eventos) {
      Object.keys(config.eventos).forEach(function (tipo) {
        nodo.addEventListener(tipo, config.eventos[tipo]);
      });
    }

    (hijos || []).forEach(function (hijo) {
      if (hijo === null || hijo === undefined || hijo === false) return;
      nodo.appendChild(typeof hijo === "string" ? doc.createTextNode(hijo) : hijo);
    });

    return nodo;
  }

  function vaciar(nodo) {
    while (nodo.firstChild) nodo.removeChild(nodo.firstChild);
  }

  /* ---------- Presentación de datos ---------- */

  function fechaCorta(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" });
  }

  function fechaHora(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("es-MX", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit"
    });
  }

  function textoODefecto(valor) {
    var v = valor === null || valor === undefined ? "" : String(valor).trim();
    return v === "" ? "—" : v;
  }

  /* Píldora de estado. El color por sí solo no comunica el estado
     (1.4.1 Uso del color): el texto siempre está presente y el modificador
     de clase solo lo refuerza. */
  function pildoraEstatus(estatus) {
    var mapa = { "Abierto": "abierto", "Cerrado": "cerrado", "Cancelado": "cancelado" };
    return el("span", {
      clase: "mf-pildora mf-pildora--" + (mapa[estatus] || "neutro"),
      texto: textoODefecto(estatus)
    });
  }

  function pildoraPrioridad(prioridad) {
    var mapa = { "Baja": "baja", "Media": "media", "Alta": "alta", "Crítica": "critica" };
    return el("span", {
      clase: "mf-prioridad mf-prioridad--" + (mapa[prioridad] || "neutro"),
      texto: textoODefecto(prioridad)
    });
  }

  /* ---------- Campos de formulario ---------- */

  var contadorId = 0;
  function idUnico(prefijo) {
    contadorId += 1;
    return prefijo + "-" + contadorId;
  }

  /* Construye label + control + mensaje de error enlazado.
     `config.tipo`: texto | textarea | select | fecha | numero */
  function campo(config) {
    var idControl = config.id || idUnico("mf-campo");
    var idError = idControl + "-error";
    var idAyuda = config.ayuda ? idControl + "-ayuda" : null;

    var control;
    if (config.tipo === "textarea") {
      control = el("textarea", {
        id: idControl,
        clase: "mf-control mf-control--area",
        attrs: { rows: config.filas || 4, name: config.nombre || idControl }
      });
      control.value = config.valor === null || config.valor === undefined ? "" : String(config.valor);
    } else if (config.tipo === "select") {
      control = el("select", {
        id: idControl,
        clase: "mf-control",
        attrs: { name: config.nombre || idControl }
      });
      (config.opciones || []).forEach(function (opcion) {
        var valor = typeof opcion === "string" ? opcion : opcion.valor;
        var etiqueta = typeof opcion === "string" ? opcion : opcion.etiqueta;
        control.appendChild(el("option", { texto: etiqueta, attrs: { value: valor } }));
      });
      control.value = config.valor === null || config.valor === undefined ? "" : String(config.valor);
    } else {
      var tipoHtml = config.tipo === "fecha" ? "date" : config.tipo === "numero" ? "number" : "text";
      control = el("input", {
        id: idControl,
        clase: "mf-control",
        attrs: { type: tipoHtml, name: config.nombre || idControl }
      });
      control.value = config.valor === null || config.valor === undefined ? "" : String(config.valor);
    }

    if (config.deshabilitado) control.disabled = true;
    if (config.requerido) control.setAttribute("aria-required", "true");
    if (config.alCambiar) control.addEventListener("change", config.alCambiar);
    if (config.alEscribir) control.addEventListener("input", config.alEscribir);

    /* Paso directo de eventos al control. Necesario para `compositionstart`
       y `compositionend`: un método de entrada por composición —teclados
       asiáticos, dictado, acentos por tecla muerta— emite `input` con texto
       provisional, y consultar con ese texto intermedio es incorrecto. */
    if (config.eventos) {
      Object.keys(config.eventos).forEach(function (tipo) {
        control.addEventListener(tipo, config.eventos[tipo]);
      });
    }

    var descripciones = [];
    if (idAyuda) descripciones.push(idAyuda);

    var nodoError = el("p", {
      id: idError,
      clase: "mf-campo-error",
      attrs: { hidden: true }
    });

    if (config.error) {
      nodoError.textContent = config.error;
      nodoError.removeAttribute("hidden");
      control.setAttribute("aria-invalid", "true");
      descripciones.push(idError);
    }

    if (descripciones.length) control.setAttribute("aria-describedby", descripciones.join(" "));

    var etiquetaTexto = config.etiqueta + (config.requerido ? " *" : "");

    return el("div", { clase: "mf-campo" + (config.error ? " mf-campo--error" : "") }, [
      el("label", { clase: "mf-campo-etiqueta", texto: etiquetaTexto, attrs: { "for": idControl } }),
      idAyuda ? el("p", { id: idAyuda, clase: "mf-campo-ayuda", texto: config.ayuda }) : null,
      control,
      nodoError
    ]);
  }

  function boton(config) {
    return el("button", {
      clase: "mf-boton mf-boton--" + (config.variante || "secundario") + (config.clase ? " " + config.clase : ""),
      texto: config.texto,
      attrs: {
        type: "button",
        disabled: config.deshabilitado || false,
        "aria-label": config.etiquetaAccesible || null,
        "data-accion": config.accion || null
      },
      eventos: config.alHacerClic ? { click: config.alHacerClic } : null
    });
  }

  /* ---------- Diálogo modal ---------- */

  var SELECTOR_FOCALIZABLE = [
    "a[href]", "button:not([disabled])", "input:not([disabled])",
    "select:not([disabled])", "textarea:not([disabled])", "[tabindex]:not([tabindex='-1'])"
  ].join(",");

  /* Devuelve { nodo, cerrar }. El llamador inserta `nodo` y decide cuándo
     cerrar; `cerrar` restituye el foco al elemento que tenía el foco antes
     de abrir, que es lo que exige un orden de foco coherente. */
  function dialogo(config) {
    var focoPrevio = doc.activeElement;
    var idTitulo = idUnico("mf-dlg-titulo");
    var cuerpo = el("div", { clase: "mf-dialogo-cuerpo" }, config.contenido || []);

    var panel = el("div", {
      clase: "mf-dialogo-panel",
      attrs: { role: "dialog", "aria-modal": "true", "aria-labelledby": idTitulo }
    }, [
      el("div", { clase: "mf-dialogo-encabezado" }, [
        el("h2", { id: idTitulo, clase: "mf-dialogo-titulo", texto: config.titulo }),
        boton({
          texto: "✕",
          variante: "icono",
          etiquetaAccesible: "Cerrar",
          alHacerClic: function () { cerrar(); }
        })
      ]),
      cuerpo,
      el("div", { clase: "mf-dialogo-pie" }, config.acciones || [])
    ]);

    var capa = el("div", { clase: "mf-dialogo-capa" }, [panel]);
    var cerrado = false;

    function focalizables() {
      return Array.prototype.slice.call(panel.querySelectorAll(SELECTOR_FOCALIZABLE))
        .filter(function (n) { return n.offsetParent !== null || n === doc.activeElement; });
    }

    function alPresionarTecla(evento) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        cerrar();
        return;
      }
      if (evento.key !== "Tab") return;

      /* Trampa de foco: el tabulador circula solo dentro del diálogo
         mientras está abierto, y vuelve a salir en cuanto se cierra. */
      var lista = focalizables();
      if (lista.length === 0) {
        evento.preventDefault();
        return;
      }
      var primero = lista[0];
      var ultimo = lista[lista.length - 1];

      if (evento.shiftKey && doc.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && doc.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    }

    function alHacerClicEnCapa(evento) {
      if (evento.target === capa) cerrar();
    }

    function cerrar() {
      if (cerrado) return;
      cerrado = true;
      panel.removeEventListener("keydown", alPresionarTecla);
      capa.removeEventListener("mousedown", alHacerClicEnCapa);
      if (capa.parentNode) capa.parentNode.removeChild(capa);
      if (focoPrevio && typeof focoPrevio.focus === "function") focoPrevio.focus();
      if (config.alCerrar) config.alCerrar();
    }

    panel.addEventListener("keydown", alPresionarTecla);
    capa.addEventListener("mousedown", alHacerClicEnCapa);

    return {
      nodo: capa,
      cerrar: cerrar,
      enfocarPrimero: function () {
        var lista = focalizables();
        (lista.length ? lista[0] : panel).focus();
      }
    };
  }

  /* ---------- Anuncios para lectores de pantalla ---------- */

  /* Región única y persistente. Crear una región `aria-live` al mismo
     tiempo que se escribe en ella no se anuncia de forma fiable: la región
     debe existir en el DOM antes de que cambie su contenido. */
  function anunciador(contenedor) {
    var region = el("p", {
      clase: "mf-solo-lectores",
      attrs: { role: "status", "aria-live": "polite", "aria-atomic": "true" }
    });
    contenedor.appendChild(region);

    return function anunciar(mensaje) {
      region.textContent = "";
      global.setTimeout(function () { region.textContent = mensaje; }, 60);
    };
  }

  function mensajeVacio(texto) {
    return el("p", { clase: "mf-vacio", texto: texto });
  }

  /* Banda de error. `alReintentar` solo se ofrece si el contrato marcó el
     código como reintentable; la interfaz nunca reintenta sola. */
  function bandaError(config) {
    return el("div", {
      clase: "mf-banda mf-banda--error",
      attrs: { role: "alert" }
    }, [
      el("span", { clase: "mf-banda-icono", texto: "!", attrs: { "aria-hidden": "true" } }),
      el("div", { clase: "mf-banda-texto" }, [
        el("p", { clase: "mf-banda-mensaje", texto: config.mensaje }),
        config.detalle ? el("p", { clase: "mf-banda-detalle", texto: config.detalle }) : null
      ]),
      config.alReintentar ? boton({ texto: "Reintentar", variante: "secundario", alHacerClic: config.alReintentar }) : null,
      config.alCerrar ? boton({ texto: "✕", variante: "icono", etiquetaAccesible: "Descartar aviso", alHacerClic: config.alCerrar }) : null
    ]);
  }

  global.ATCMisFoliosComponentes = Object.freeze({
    el: el,
    vaciar: vaciar,
    campo: campo,
    boton: boton,
    dialogo: dialogo,
    anunciador: anunciador,
    bandaError: bandaError,
    mensajeVacio: mensajeVacio,
    pildoraEstatus: pildoraEstatus,
    pildoraPrioridad: pildoraPrioridad,
    fechaCorta: fechaCorta,
    fechaHora: fechaHora,
    textoODefecto: textoODefecto,
    idUnico: idUnico
  });
})(typeof window !== "undefined" ? window : globalThis);
