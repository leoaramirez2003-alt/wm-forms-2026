/* ================================================================
   Mis Folios — Página del módulo
   MIS-FOLIOS-CRM-ATC-01 · Fase 2 · Fable 5

   Renderiza listado y detalle a partir del estado, y traduce cada
   interacción a una llamada del servicio. No decide permisos: cada
   acción se ofrece únicamente si `capacidades` — calculada por el
   servicio y recibida en OBTENER_FOLIO — la habilita.

   Ocultar un botón no es una medida de seguridad y aquí no se trata
   como tal. Si alguien fuerza el DOM y dispara una acción sin permiso,
   el servicio responde ROLE_NOT_ALLOWED o NOT_OWNER y la interfaz lo
   muestra. La visibilidad es una comodidad, no un control.
   ================================================================ */
(function (global) {
  "use strict";

  var C = global.ATCMisFoliosContratos;
  var U = global.ATCMisFoliosComponentes;
  var V = global.ATCMisFoliosValidaciones;
  var S = global.ATCMisFoliosServicio;
  var E = global.ATCMisFoliosEstado;

  var el = U.el;
  var raiz = null;
  var anunciar = function () {};
  var desuscribir = null;

  /* ---------- Regiones vivas ----------

     El render no reconstruye la pantalla entera. Reemplazar el árbol en
     cada cambio de estado destruye el nodo que el usuario tiene enfocado,
     y con él el foco, el cursor y la composición de entrada. Fue un
     defecto real: el buscador perdía el foco tras cada carácter.

     Por eso la pantalla se divide en regiones con vidas distintas:

       aviso       se reemplaza en cada render; no contiene entrada de texto
       vista       se reconstruye solo al cambiar de listado a detalle
       filtros     se construye UNA vez por montaje del listado y nunca más
       resultados  se reemplaza con cada cambio de datos

     Los controles de filtro no están gobernados por el estado: una vez
     construidos, el DOM es la fuente de su propio valor visible. El estado
     guarda lo que se consultó, no lo que se está escribiendo. */
  var montaje = {
    vista: null,
    contenedorVista: null,
    contenedorAviso: null,
    resultados: null,
    alcance: null,
    controlesFiltro: null
  };

  function reiniciarMontaje() {
    montaje = {
      vista: null,
      contenedorVista: null,
      contenedorAviso: null,
      resultados: null,
      alcance: null,
      subtitulo: null,
      controlesFiltro: null
    };
  }

  /* ---------- Búsqueda con retardo ----------

     El retardo se aplica a la CONSULTA, nunca al valor visible: el carácter
     aparece en el instante en que se teclea porque nadie toca el input.

     600 ms y no los 300 habituales: quien escribe despacio hace pausas de
     medio segundo entre teclas, y con un umbral corto la lista se recargaría
     a media palabra. Nadie queda bloqueado por esperar — el texto ya está en
     pantalla y Enter consulta al instante. */
  var DEBOUNCE_BUSQUEDA_MS = 600;
  var temporizadorBusqueda = null;
  var componiendoEntrada = false;

  function cancelarBusqueda() {
    if (temporizadorBusqueda) {
      global.clearTimeout(temporizadorBusqueda);
      temporizadorBusqueda = null;
    }
  }

  function aplicarBusqueda(texto) {
    cancelarBusqueda();
    var actuales = E.obtener().filtros;
    var limpio = String(texto === null || texto === undefined ? "" : texto).trim();
    var nuevo = limpio === "" ? null : limpio;

    /* Si el término no cambió no se consulta: evita una recarga cuando el
       usuario escribe y borra un carácter, o pulsa Enter dos veces. */
    if ((actuales.folio || null) === nuevo) return Promise.resolve();

    E.actualizar({ filtros: Object.assign({}, actuales, { folio: nuevo, cursor: null }) });
    return cargarListado();
  }

  function programarBusqueda(texto) {
    cancelarBusqueda();
    temporizadorBusqueda = global.setTimeout(function () {
      temporizadorBusqueda = null;
      aplicarBusqueda(texto);
    }, DEBOUNCE_BUSQUEDA_MS);
  }

  /* ---------- Utilidades de render ---------- */

  function manejarRespuesta(resultado, alExito) {
    if (resultado.ok) {
      E.actualizar({ errorGlobal: null });
      return alExito ? alExito(resultado) : resultado;
    }

    /* Cancelada: se descarta en silencio. Solo se baja el indicador de
       carga, porque la solicitud que lo levantó ya no va a volver. */
    if (resultado.cancelado) {
      if (E.obtener().cargando) E.actualizar({ cargando: false });
      return resultado;
    }

    /* ETAG_MISMATCH no es un error más: deja la interfaz en un estado del
       que solo se sale recargando, para que no exista forma de reintentar
       a ciegas sobre una versión caducada. */
    if (resultado.code === "ETAG_MISMATCH") {
      E.actualizar({
        conflicto: { mensaje: resultado.mensaje, correlacionId: resultado.correlacionId },
        edicion: Object.assign({}, E.obtener().edicion, { enviando: false })
      });
      anunciar("El folio cambió mientras lo editabas. Recarga para ver la versión vigente.");
      return resultado;
    }

    if (resultado.code === "VALIDATION_ERROR" && resultado.campos.length) {
      var errores = {};
      resultado.campos.forEach(function (campo) {
        errores[campo] = "El servicio rechazó este valor.";
      });
      E.actualizar({
        edicion: Object.assign({}, E.obtener().edicion, { errores: errores, enviando: false })
      });
    }

    E.actualizar({
      errorGlobal: { mensaje: resultado.mensaje, code: resultado.code, reintentable: resultado.reintentable },
      cargando: false
    });
    anunciar(resultado.mensaje);
    return resultado;
  }

  /* ---------- Acciones ---------- */

  function cargarListado() {
    var estado = E.obtener();
    E.actualizar({ cargando: true, errorGlobal: null });

    return S.consultarFolios(estado.alcance, estado.filtros).then(function (r) {
      return manejarRespuesta(r, function (exito) {
        E.actualizar({
          cargando: false,
          listado: {
            items: exito.datos.items,
            siguienteCursor: exito.datos.siguienteCursor,
            total: exito.datos.total
          }
        });
        anunciar(exito.datos.total + " folios encontrados.");
      });
    });
  }

  function abrirDetalle(folioItemId, incluirTrazabilidad) {
    E.actualizar({ cargando: true, errorGlobal: null, conflicto: null });

    return S.obtenerFolio(folioItemId, { incluirTrazabilidad: !!incluirTrazabilidad }).then(function (r) {
      return manejarRespuesta(r, function (exito) {
        E.actualizar({
          vista: "detalle",
          cargando: false,
          conflicto: null,
          detalle: {
            folioItemId: folioItemId,
            folio: exito.datos.folio,
            etag: exito.etag,
            versionNegocio: exito.versionNegocio,
            capacidades: exito.datos.capacidades,
            comentarios: exito.datos.comentarios || [],
            evidencias: exito.datos.evidencias || [],
            trazabilidad: exito.datos.trazabilidad || []
          },
          edicion: { activa: false, borrador: {}, errores: {}, enviando: false }
        });
        anunciar("Folio " + exito.datos.folio.folio + " abierto.");
      });
    });
  }

  function volverAlListado() {
    E.actualizar({
      vista: "listado",
      conflicto: null,
      detalle: E.estadoInicial().detalle,
      edicion: E.estadoInicial().edicion
    });
    anunciar("Listado de folios.");
  }

  function recargarDetalle() {
    var estado = E.obtener();
    return abrirDetalle(estado.detalle.folioItemId, estado.detalle.trazabilidad.length > 0);
  }

  function iniciarEdicion() {
    var folio = E.obtener().detalle.folio;
    var borrador = {};
    C.CAMPOS_EDITABLES.forEach(function (campo) {
      borrador[campo] = folio[campo] === null || folio[campo] === undefined ? "" : folio[campo];
    });
    E.actualizar({ edicion: { activa: true, borrador: borrador, errores: {}, enviando: false } });
    anunciar("Edición activada.");
  }

  function cancelarEdicion() {
    E.actualizar({ edicion: { activa: false, borrador: {}, errores: {}, enviando: false } });
    anunciar("Edición cancelada. No se guardó ningún cambio.");
  }

  function guardarEdicion() {
    var estado = E.obtener();
    var normalizado = V.aplicarLimpiezaDependiente(estado.edicion.borrador);
    var errores = V.validarEdicion(normalizado);

    if (Object.keys(errores).length) {
      E.actualizar({ edicion: Object.assign({}, estado.edicion, { errores: errores }) });
      anunciar("Hay campos por corregir antes de guardar.");
      return Promise.resolve({ ok: false, code: "VALIDATION_ERROR" });
    }

    var cambios = V.calcularCambios(estado.detalle.folio, normalizado);
    if (Object.keys(cambios).length === 0) {
      E.actualizar({ errorGlobal: { mensaje: "No hay cambios que guardar.", code: null, reintentable: false } });
      anunciar("No hay cambios que guardar.");
      return Promise.resolve({ ok: false, code: null });
    }

    E.actualizar({ edicion: Object.assign({}, estado.edicion, { enviando: true, errores: {} }) });

    return S.editarFolio(estado.detalle.folioItemId, estado.detalle.etag, cambios).then(function (r) {
      return manejarRespuesta(r, function () {
        anunciar("Cambios guardados.");
        return recargarDetalle();
      });
    });
  }

  function ejecutarCambioEstatus(accion, motivo) {
    var estado = E.obtener();
    return S.cambiarEstatus(estado.detalle.folioItemId, estado.detalle.etag, accion, motivo).then(function (r) {
      return manejarRespuesta(r, function (exito) {
        anunciar("Folio actualizado a " + exito.datos.estatusInterno + ".");
        return recargarDetalle();
      });
    });
  }

  function ejecutarReasignacion(oidDestino, motivo) {
    var estado = E.obtener();
    return S.reasignarFolio(estado.detalle.folioItemId, estado.detalle.etag, oidDestino, motivo).then(function (r) {
      return manejarRespuesta(r, function (exito) {
        anunciar("Folio reasignado a " + exito.datos.responsableNuevoPersona + ".");
        return recargarDetalle();
      });
    });
  }

  function ejecutarComentario(texto) {
    var estado = E.obtener();
    return S.agregarComentario(estado.detalle.folioItemId, estado.detalle.etag, texto).then(function (r) {
      return manejarRespuesta(r, function () {
        anunciar("Comentario agregado.");
        return recargarDetalle();
      });
    });
  }

  function ejecutarCargaEvidencia(archivo) {
    var estado = E.obtener();
    return S.cargarEvidencia(estado.detalle.folioItemId, estado.detalle.etag, archivo).then(function (r) {
      return manejarRespuesta(r, function () {
        anunciar("Evidencia cargada.");
        return recargarDetalle();
      });
    });
  }

  function ejecutarInvalidacion(evidenciaItemId, motivo) {
    var estado = E.obtener();
    return S.invalidarEvidencia(estado.detalle.folioItemId, evidenciaItemId, motivo).then(function (r) {
      return manejarRespuesta(r, function () {
        anunciar("Evidencia invalidada. El archivo se conserva.");
        return recargarDetalle();
      });
    });
  }

  function ejecutarSustitucion(evidenciaAnteriorId, motivo, archivo) {
    var estado = E.obtener();
    return S.sustituirEvidencia(estado.detalle.folioItemId, evidenciaAnteriorId, motivo, archivo).then(function (r) {
      return manejarRespuesta(r, function () {
        anunciar("Evidencia sustituida. Se conservan ambos documentos.");
        return recargarDetalle();
      });
    });
  }

  /* ---------- Diálogos ---------- */

  function abrirDialogo(config) {
    var dlg = U.dialogo(config);
    raiz.appendChild(dlg.nodo);
    dlg.enfocarPrimero();
    return dlg;
  }

  function dialogoConMotivo(config) {
    var idMotivo = U.idUnico("mf-motivo");
    var contenedorError = el("p", { clase: "mf-campo-error", attrs: { hidden: true, role: "alert" } });

    var campoMotivo = U.campo({
      id: idMotivo,
      etiqueta: "Motivo",
      tipo: "textarea",
      filas: 3,
      requerido: config.motivoRequerido !== false,
      valor: ""
    });

    var dlg;

    function confirmar() {
      var control = campoMotivo.querySelector("#" + idMotivo);
      var motivo = control.value;

      if (config.motivoRequerido !== false) {
        var problema = V.validarMotivo(motivo);
        if (problema) {
          contenedorError.textContent = problema;
          contenedorError.removeAttribute("hidden");
          control.setAttribute("aria-invalid", "true");
          control.focus();
          return;
        }
      }
      dlg.cerrar();
      config.alConfirmar(motivo);
    }

    dlg = abrirDialogo({
      titulo: config.titulo,
      contenido: [
        config.descripcion ? el("p", { clase: "mf-dialogo-descripcion", texto: config.descripcion }) : null,
        campoMotivo,
        contenedorError
      ],
      acciones: [
        U.boton({ texto: "Cancelar", variante: "secundario", alHacerClic: function () { dlg.cerrar(); } }),
        U.boton({ texto: config.textoConfirmar || "Confirmar", variante: "primario", alHacerClic: confirmar })
      ]
    });

    return dlg;
  }

  function dialogoReasignacion() {
    var estado = E.obtener();
    var idDestino = U.idUnico("mf-destino");
    var idMotivo = U.idUnico("mf-motivo-reasig");
    var errorNodo = el("p", { clase: "mf-campo-error", attrs: { hidden: true, role: "alert" } });

    var opciones = [{ valor: "", etiqueta: "Selecciona…" }].concat(
      estado.usuariosAsignables.map(function (u) {
        return { valor: u.oid, etiqueta: u.nombreVisible + " · " + u.rolFuncional };
      })
    );

    var campoDestino = U.campo({ id: idDestino, etiqueta: "Nuevo responsable", tipo: "select", opciones: opciones, requerido: true });
    var campoMotivo = U.campo({ id: idMotivo, etiqueta: "Motivo", tipo: "textarea", filas: 3, requerido: true });

    var dlg;

    function confirmar() {
      var destino = campoDestino.querySelector("#" + idDestino).value;
      var motivo = campoMotivo.querySelector("#" + idMotivo).value;

      if (!destino) {
        errorNodo.textContent = "Selecciona a la persona que recibirá el folio.";
        errorNodo.removeAttribute("hidden");
        return;
      }
      var problema = V.validarMotivo(motivo);
      if (problema) {
        errorNodo.textContent = problema;
        errorNodo.removeAttribute("hidden");
        return;
      }
      dlg.cerrar();
      ejecutarReasignacion(destino, motivo);
    }

    dlg = abrirDialogo({
      titulo: "Reasignar folio",
      contenido: [
        el("p", { clase: "mf-dialogo-descripcion", texto: "La reasignación cambia solo al responsable. Los datos operativos del folio no se modifican." }),
        campoDestino,
        campoMotivo,
        errorNodo
      ],
      acciones: [
        U.boton({ texto: "Cancelar", variante: "secundario", alHacerClic: function () { dlg.cerrar(); } }),
        U.boton({ texto: "Reasignar", variante: "primario", alHacerClic: confirmar })
      ]
    });
  }

  function dialogoEvidencia(config) {
    var idArchivo = U.idUnico("mf-archivo");
    var idMotivo = U.idUnico("mf-motivo-evidencia");
    var errorNodo = el("p", { clase: "mf-campo-error", attrs: { hidden: true, role: "alert" } });

    var campoArchivo = U.campo({
      id: idArchivo,
      etiqueta: "Nombre del archivo",
      tipo: "texto",
      requerido: true,
      ayuda: "Formatos permitidos: " + C.EXTENSIONES_EVIDENCIA.join(", ") + "."
    });

    var campoMotivo = config.pedirMotivo
      ? U.campo({ id: idMotivo, etiqueta: "Motivo", tipo: "textarea", filas: 3, requerido: true })
      : null;

    var dlg;

    function confirmar() {
      var nombre = campoArchivo.querySelector("#" + idArchivo).value;
      var problema = V.validarNombreArchivo(nombre);
      if (problema) {
        errorNodo.textContent = problema;
        errorNodo.removeAttribute("hidden");
        return;
      }

      var motivo = "";
      if (campoMotivo) {
        motivo = campoMotivo.querySelector("#" + idMotivo).value;
        var problemaMotivo = V.validarMotivo(motivo);
        if (problemaMotivo) {
          errorNodo.textContent = problemaMotivo;
          errorNodo.removeAttribute("hidden");
          return;
        }
      }

      dlg.cerrar();
      config.alConfirmar({ nombreArchivo: String(nombre).trim() }, motivo);
    }

    dlg = abrirDialogo({
      titulo: config.titulo,
      contenido: [
        el("p", { clase: "mf-dialogo-descripcion", texto: config.descripcion }),
        campoArchivo,
        campoMotivo,
        errorNodo
      ],
      acciones: [
        U.boton({ texto: "Cancelar", variante: "secundario", alHacerClic: function () { dlg.cerrar(); } }),
        U.boton({ texto: config.textoConfirmar, variante: "primario", alHacerClic: confirmar })
      ]
    });
  }

  function dialogoComentario() {
    var idTexto = U.idUnico("mf-comentario");
    var errorNodo = el("p", { clase: "mf-campo-error", attrs: { hidden: true, role: "alert" } });
    var campoTexto = U.campo({ id: idTexto, etiqueta: "Comentario", tipo: "textarea", filas: 4, requerido: true });
    var dlg;

    function confirmar() {
      var texto = campoTexto.querySelector("#" + idTexto).value;
      var problema = V.validarComentario(texto);
      if (problema) {
        errorNodo.textContent = problema;
        errorNodo.removeAttribute("hidden");
        return;
      }
      dlg.cerrar();
      ejecutarComentario(String(texto).trim());
    }

    dlg = abrirDialogo({
      titulo: "Agregar comentario",
      contenido: [
        el("p", { clase: "mf-dialogo-descripcion", texto: "Los comentarios no se editan ni se eliminan. Para corregir uno, agrega otro." }),
        campoTexto,
        errorNodo
      ],
      acciones: [
        U.boton({ texto: "Cancelar", variante: "secundario", alHacerClic: function () { dlg.cerrar(); } }),
        U.boton({ texto: "Agregar", variante: "primario", alHacerClic: confirmar })
      ]
    });
  }

  /* ---------- Render: listado ---------- */

  /* Se construye UNA vez por montaje del listado. Ningún render posterior lo
     reemplaza, así que los controles conservan nodo, foco, cursor y selección
     mientras el usuario permanece en la pantalla. */
  function renderFiltros(estado) {
    var filtros = estado.filtros;
    var controles = {};

    function alCambiarLista(clave) {
      return function (evento) {
        var valor = evento.target.value;
        var nuevos = Object.assign({}, E.obtener().filtros, { cursor: null });
        nuevos[clave] = valor ? [valor] : [];
        E.actualizar({ filtros: nuevos });
        cargarListado();
      };
    }

    function opcionesDe(lista) {
      return [{ valor: "", etiqueta: "Todos" }].concat(lista.map(function (v) {
        return { valor: v, etiqueta: v };
      }));
    }

    function registrar(campo, clave, id) {
      controles[clave] = campo.querySelector("#" + id);
      return campo;
    }

    var campanas = ["Banorte", "GS Infonavit", "ATF", "Centro Preventivo"];
    var prioridades = ["Baja", "Media", "Alta", "Crítica"];

    var idBusqueda = U.idUnico("mf-filtro-folio");

    var campoBusqueda = U.campo({
      id: idBusqueda,
      etiqueta: "Buscar folio",
      tipo: "texto",
      valor: filtros.folio || "",
      /* Texto fijo bajo la etiqueta, visible siempre y enlazado por
         aria-describedby. No es un aviso que aparezca y desaparezca: quien
         escribe despacio necesita poder leerlo en cualquier momento. */
      ayuda: "Escribe a tu ritmo. Los resultados se actualizan cuando haces una pausa, o al pulsar Enter.",
      eventos: {
        input: function (evento) {
          /* No se escribe en el estado ni se repinta nada: el carácter ya
             está en pantalla porque el navegador lo puso. Solo se programa
             la consulta. */
          if (componiendoEntrada) return;
          programarBusqueda(evento.target.value);
        },
        compositionstart: function () {
          componiendoEntrada = true;
          cancelarBusqueda();
        },
        compositionend: function (evento) {
          componiendoEntrada = false;
          programarBusqueda(evento.target.value);
        },
        keydown: function (evento) {
          if (evento.key !== "Enter") return;
          /* Enter consulta de inmediato. `preventDefault` impide el envío
             nativo del formulario, que recargaría la página. */
          evento.preventDefault();
          aplicarBusqueda(evento.target.value);
        }
      }
    });

    var idEstatus = U.idUnico("mf-filtro-estatus");
    var idCampana = U.idUnico("mf-filtro-campana");
    var idPrioridad = U.idUnico("mf-filtro-prioridad");
    var idVentana = U.idUnico("mf-filtro-ventana");

    var formulario = el("form", {
      clase: "mf-filtros",
      attrs: { role: "search", "aria-label": "Filtros de folios" },
      eventos: {
        submit: function (evento) {
          evento.preventDefault();
          aplicarBusqueda(controles.folio ? controles.folio.value : "");
        }
      }
    }, [
      registrar(campoBusqueda, "folio", idBusqueda),
      registrar(U.campo({
        id: idEstatus,
        etiqueta: "Estatus",
        tipo: "select",
        valor: filtros.estatus[0] || "",
        opciones: opcionesDe([C.ESTATUS.ABIERTO, C.ESTATUS.CERRADO, C.ESTATUS.CANCELADO]),
        alCambiar: alCambiarLista("estatus")
      }), "estatus", idEstatus),
      registrar(U.campo({
        id: idCampana,
        etiqueta: "Campaña",
        tipo: "select",
        valor: filtros.tipoGestion[0] || "",
        opciones: opcionesDe(campanas),
        alCambiar: alCambiarLista("tipoGestion")
      }), "tipoGestion", idCampana),
      registrar(U.campo({
        id: idPrioridad,
        etiqueta: "Prioridad",
        tipo: "select",
        valor: filtros.prioridad[0] || "",
        opciones: opcionesDe(prioridades),
        alCambiar: alCambiarLista("prioridad")
      }), "prioridad", idPrioridad),
      registrar(U.campo({
        id: idVentana,
        etiqueta: "Ventana",
        tipo: "select",
        valor: filtros.ventana,
        opciones: [
          { valor: C.VENTANAS.DOCE_MESES, etiqueta: "Últimos 12 meses" },
          { valor: C.VENTANAS.TODO, etiqueta: "Histórico completo" }
        ],
        alCambiar: function (evento) {
          E.actualizar({ filtros: Object.assign({}, E.obtener().filtros, { ventana: evento.target.value, cursor: null }) });
          cargarListado();
        }
      }), "ventana", idVentana),
      el("div", { clase: "mf-filtros-acciones" }, [
        U.boton({
          texto: "Aplicar",
          variante: "primario",
          alHacerClic: function () {
            aplicarBusqueda(controles.folio ? controles.folio.value : "");
            cargarListado();
          }
        }),
        U.boton({
          texto: "Limpiar",
          variante: "secundario",
          alHacerClic: limpiarFiltros
        })
      ])
    ]);

    montaje.controlesFiltro = controles;
    return formulario;
  }

  /* Los controles no se reconstruyen, así que restablecerlos es escribir en
     los nodos vivos. Se hace explícito y no con `form.reset()`, que depende
     de atributos `value` que este módulo nunca declara. */
  function limpiarFiltros() {
    cancelarBusqueda();

    var iniciales = E.estadoInicial().filtros;
    var controles = montaje.controlesFiltro || {};

    if (controles.folio) controles.folio.value = "";
    if (controles.estatus) controles.estatus.value = "";
    if (controles.tipoGestion) controles.tipoGestion.value = "";
    if (controles.prioridad) controles.prioridad.value = "";
    if (controles.ventana) controles.ventana.value = iniciales.ventana;

    E.actualizar({ filtros: iniciales });
    return cargarListado();
  }

  function renderTabla(estado) {
    if (estado.listado.items.length === 0) {
      return U.mensajeVacio(
        estado.alcance === "MIOS"
          ? "No tienes folios asignados con estos filtros."
          : "No hay folios que coincidan con estos filtros."
      );
    }

    var encabezados = ["Folio", "Campaña", "Trámite", "Atención", "Estatus", "Prioridad", "Recepción", "Responsable", "Acción"];

    var filas = estado.listado.items.map(function (item) {
      return el("tr", {}, [
        el("th", { attrs: { scope: "row" }, clase: "mf-celda-folio", texto: item.folio }),
        el("td", { texto: U.textoODefecto(item.tipoGestion) }),
        el("td", { texto: U.textoODefecto(item.tipoTramite) }),
        el("td", { texto: U.textoODefecto(item.tipoAtencion) }),
        el("td", {}, [U.pildoraEstatus(item.estatusInterno)]),
        el("td", {}, [U.pildoraPrioridad(item.prioridadAtencion)]),
        el("td", { clase: "mf-celda-numerica", texto: U.fechaCorta(item.fechaRecepcionATC) }),
        el("td", { texto: U.textoODefecto(item.responsableAsignadoPersona) }),
        el("td", {}, [
          U.boton({
            texto: "Abrir",
            variante: "enlace",
            /* El nombre accesible incluye el folio: "Abrir" repetido en cada
               fila no distingue nada al navegar por lista de enlaces. */
            etiquetaAccesible: "Abrir folio " + item.folio,
            alHacerClic: function () { abrirDetalle(item.folioItemId); }
          })
        ])
      ]);
    });

    return el("div", { clase: "mf-tabla-marco" }, [
      el("table", { clase: "mf-tabla" }, [
        el("caption", { clase: "mf-solo-lectores", texto: "Folios: " + estado.listado.total + " resultados" }),
        el("thead", {}, [
          el("tr", {}, encabezados.map(function (h) {
            return el("th", { texto: h, attrs: { scope: "col" } });
          }))
        ]),
        el("tbody", {}, filas)
      ])
    ]);
  }

  /* Contador y paginación viven dentro de la región de resultados: son lo
     que cambia cuando cambia la consulta. El contador se muestra siempre que
     haya resultados, no solo cuando queda una página pendiente. */
  function renderPieResultados(estado) {
    if (estado.listado.total === 0) return null;

    var hayMas = !!estado.listado.siguienteCursor;

    return el("div", { clase: "mf-paginacion" }, [
      el("p", {
        clase: "mf-paginacion-texto",
        texto: "Mostrando " + estado.listado.items.length + " de " + estado.listado.total + " folios."
      }),
      hayMas ? U.boton({
        texto: "Cargar más",
        variante: "secundario",
        accion: "cargar-mas",
        alHacerClic: function () {
          var actual = E.obtener();
          E.actualizar({ filtros: Object.assign({}, actual.filtros, { cursor: actual.listado.siguienteCursor }) });
          cargarListado();
        }
      }) : null
    ]);
  }

  /* Reemplaza el contenido de la región de resultados conservando el nodo
     contenedor. Si el foco estaba dentro —el único caso real es "Cargar
     más"— se restituye sobre el control equivalente del árbol nuevo. */
  function pintarResultados(estado, contenedor) {
    var activo = global.document.activeElement;
    var accionEnfocada = (activo && contenedor.contains(activo))
      ? activo.getAttribute("data-accion")
      : null;

    U.vaciar(contenedor);

    contenedor.appendChild(
      estado.cargando
        ? el("p", { clase: "mf-cargando", texto: "Cargando folios…" })
        : renderTabla(estado)
    );

    var pie = renderPieResultados(estado);
    if (pie) contenedor.appendChild(pie);

    if (accionEnfocada) {
      var reemplazo = contenedor.querySelector('[data-accion="' + accionEnfocada + '"]');
      if (reemplazo) reemplazo.focus();
    }
  }

  /* El encabezado tampoco se reconstruye: se actualiza en el sitio. Repintarlo
     movería el foco fuera del botón que el usuario acaba de pulsar. */
  function actualizarEncabezado(estado) {
    if (montaje.subtitulo) {
      montaje.subtitulo.textContent = estado.alcance === "MIOS"
        ? "Folios asignados a ti."
        : "Todos los folios visibles para tu perfil.";
    }

    if (!montaje.alcance) return;

    Object.keys(montaje.alcance).forEach(function (clave) {
      var boton = montaje.alcance[clave];
      var activo = estado.alcance === clave;
      boton.className = "mf-boton mf-boton--" + (activo ? "primario" : "secundario");
      boton.setAttribute("aria-pressed", activo ? "true" : "false");
    });
  }

  function renderListado(estado) {
    var esSupervisor = estado.perfilSesion === C.PERFILES.GERENCIA ||
                       estado.perfilSesion === C.PERFILES.DIRECCION;

    function botonAlcance(clave, texto) {
      return U.boton({
        texto: texto,
        variante: estado.alcance === clave ? "primario" : "secundario",
        alHacerClic: function () {
          var actual = E.obtener();
          if (actual.alcance === clave) return;
          E.actualizar({ alcance: clave, filtros: Object.assign({}, actual.filtros, { cursor: null }) });
          cargarListado();
        }
      });
    }

    var alcance = null;
    if (esSupervisor) {
      var botonMios = botonAlcance("MIOS", "Mis folios");
      var botonTodos = botonAlcance("TODOS", "Todos los folios");
      botonMios.setAttribute("aria-pressed", estado.alcance === "MIOS" ? "true" : "false");
      botonTodos.setAttribute("aria-pressed", estado.alcance === "TODOS" ? "true" : "false");
      montaje.alcance = { MIOS: botonMios, TODOS: botonTodos };
      alcance = el("div", {
        clase: "mf-alcance",
        attrs: { role: "group", "aria-label": "Alcance de la consulta" }
      }, [botonMios, botonTodos]);
    } else {
      montaje.alcance = null;
    }

    var resultados = el("div", { attrs: { "data-mf-resultados": "" } });
    montaje.resultados = resultados;
    pintarResultados(estado, resultados);

    var subtitulo = el("p", {
      clase: "mf-subtitulo",
      texto: estado.alcance === "MIOS"
        ? "Folios asignados a ti."
        : "Todos los folios visibles para tu perfil."
    });
    montaje.subtitulo = subtitulo;

    return el("div", { clase: "mf-listado" }, [
      el("div", { clase: "mf-encabezado" }, [
        el("div", {}, [
          el("h1", { clase: "mf-titulo", texto: "Mis Folios" }),
          subtitulo
        ]),
        alcance
      ]),
      renderFiltros(estado),
      resultados
    ]);
  }

  /* ---------- Render: detalle ---------- */

  function filaDato(etiqueta, valor) {
    return el("div", { clase: "mf-dato" }, [
      el("dt", { clase: "mf-dato-etiqueta", texto: etiqueta }),
      el("dd", { clase: "mf-dato-valor", texto: U.textoODefecto(valor) })
    ]);
  }

  function renderIdentificacion(folio) {
    return el("section", { clase: "mf-seccion", attrs: { "aria-labelledby": "mf-sec-identificacion" } }, [
      el("h2", { id: "mf-sec-identificacion", clase: "mf-seccion-titulo", texto: "Identificación" }),
      el("p", {
        clase: "mf-seccion-nota",
        texto: "Estos campos identifican el folio y no se editan desde Mis Folios."
      }),
      el("dl", { clase: "mf-datos" }, [
        filaDato("Folio", folio.folio),
        filaDato("Campaña", folio.tipoGestion),
        filaDato("Tipo de trámite", folio.tipoTramite),
        filaDato("Tipo de atención", folio.tipoAtencion),
        filaDato("Fecha de recepción", U.fechaCorta(folio.fechaRecepcionATC)),
        filaDato("Gestor de captura", folio.nombreGestor),
        filaDato("Responsable actual", folio.responsableAsignadoPersona),
        filaDato("Fecha de asignación", U.fechaCorta(folio.fechaAsignacion))
      ])
    ]);
  }

  /* Los campos operativos se agrupan igual en lectura y en edición para que
     la posición de cada dato no cambie al alternar de modo. */
  var GRUPOS_OPERATIVOS = [
    {
      titulo: "Resultado de la atención",
      campos: [
        { nombre: "Imputable_Gral", etiqueta: "Imputable general", tipo: "select", opciones: ["", "Sí", "No"] },
        { nombre: "Resultado_Queja", etiqueta: "Resultado de la queja", tipo: "select", opciones: ["", "Procede", "No procede"] },
        { nombre: "Analisis_Queja", etiqueta: "Análisis de la queja", tipo: "textarea" },
        { nombre: "Es_Error_Analista", etiqueta: "¿Error del analista?", tipo: "select", opciones: ["", "Sí", "No"] },
        { nombre: "Prioridad_Atencion", etiqueta: "Prioridad", tipo: "select", opciones: ["", "Baja", "Media", "Alta", "Crítica"] }
      ]
    },
    {
      titulo: "Impacto económico",
      campos: [
        { nombre: "Tiene_Impacto_Economico", etiqueta: "¿Tiene impacto económico?", tipo: "select", opciones: ["", "Sí", "No"] },
        { nombre: "Impacto_Economico", etiqueta: "Monto del impacto", tipo: "texto" }
      ]
    },
    {
      titulo: "Origen y seguimiento",
      campos: [
        { nombre: "Solicitud_Relacionada", etiqueta: "Solicitud relacionada", tipo: "select", opciones: ["", "Solicitud VIP", "Otro"] },
        { nombre: "Solicitud_Relacionada_Otro", etiqueta: "Detalle de la solicitud", tipo: "texto" },
        { nombre: "Seguimiento_Con", etiqueta: "Seguimiento con", tipo: "texto" },
        { nombre: "Quien_Activa", etiqueta: "Quién activa", tipo: "select", opciones: ["", "Cliente", "Otro"] },
        { nombre: "Quien_Activa_Otro", etiqueta: "Detalle de quién activa", tipo: "texto" },
        { nombre: "Contratante", etiqueta: "Contratante", tipo: "texto" },
        { nombre: "Contratante_Otro", etiqueta: "Detalle del contratante", tipo: "texto" },
        { nombre: "Cuenta_Con_Pruebas", etiqueta: "¿Cuenta con pruebas?", tipo: "select", opciones: ["", "Sí", "No"] }
      ]
    },
    {
      titulo: "Dictamen",
      campos: [
        { nombre: "Fecha_Respuesta_Final", etiqueta: "Fecha de respuesta final", tipo: "fecha" },
        { nombre: "Nombre_Dictaminador", etiqueta: "Dictaminador", tipo: "texto" },
        { nombre: "Tipo_Condicion", etiqueta: "Tipo de condición", tipo: "texto" },
        { nombre: "Catalogo", etiqueta: "Catálogo", tipo: "texto" }
      ]
    },
    {
      titulo: "Implicación",
      campos: [
        { nombre: "Implicacion", etiqueta: "Implicación", tipo: "select", opciones: ["Ninguna", "UNE", "CONDUSEF", "DEMANDA"] },
        { nombre: "Cargo_Persona_Implicada", etiqueta: "Cargo de la persona implicada", tipo: "texto" },
        { nombre: "Partida_Subgrupo", etiqueta: "Partida o subgrupo", tipo: "texto" }
      ]
    },
    {
      titulo: "Activación interna",
      campos: [
        { nombre: "Tipo_Activacion_Interna", etiqueta: "Tipo de activación interna", tipo: "select", opciones: ["", "Area interna", "Otro"] },
        { nombre: "Tipo_Activacion_Interna_Otro", etiqueta: "Detalle del tipo de activación", tipo: "texto" },
        { nombre: "Detalle_Activacion_Interna", etiqueta: "Detalle de la activación", tipo: "textarea" },
        { nombre: "Cuenta_Con_Respuesta_Area_Interna", etiqueta: "¿Hay respuesta del área interna?", tipo: "select", opciones: ["", "Sí", "No"] },
        { nombre: "Fecha_Activacion_Area", etiqueta: "Fecha de activación del área", tipo: "fecha" },
        { nombre: "Fecha_Respuesta_Area_Interna", etiqueta: "Fecha de respuesta del área", tipo: "fecha" }
      ]
    },
    {
      titulo: "Acción correctiva",
      campos: [
        { nombre: "Se_Realizo_Accion_Correctiva", etiqueta: "¿Se realizó acción correctiva?", tipo: "select", opciones: ["Aplica", "No aplica"] },
        { nombre: "Accion_Correctiva_Detalle", etiqueta: "Detalle de la acción correctiva", tipo: "textarea" }
      ]
    }
  ];

  function valorFecha(valor) {
    if (!valor) return "";
    var d = new Date(valor);
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }

  function renderOperativosLectura(folio) {
    return GRUPOS_OPERATIVOS.map(function (grupo) {
      return el("section", { clase: "mf-seccion" }, [
        el("h3", { clase: "mf-seccion-subtitulo", texto: grupo.titulo }),
        el("dl", { clase: "mf-datos" }, grupo.campos.map(function (campo) {
          var valor = campo.tipo === "fecha" ? U.fechaCorta(folio[campo.nombre]) : folio[campo.nombre];
          return filaDato(campo.etiqueta, valor);
        }))
      ]);
    });
  }

  function renderOperativosEdicion(estado) {
    var edicion = estado.edicion;

    return GRUPOS_OPERATIVOS.map(function (grupo) {
      return el("section", { clase: "mf-seccion" }, [
        el("h3", { clase: "mf-seccion-subtitulo", texto: grupo.titulo }),
        el("div", { clase: "mf-rejilla" }, grupo.campos.map(function (definicion) {
          var valorActual = edicion.borrador[definicion.nombre];
          return U.campo({
            etiqueta: definicion.etiqueta,
            tipo: definicion.tipo,
            valor: definicion.tipo === "fecha" ? valorFecha(valorActual) : valorActual,
            opciones: definicion.opciones,
            error: edicion.errores[definicion.nombre] || null,
            /* Ambos manejadores escriben en el borrador SIN notificar al
               store. Notificar repintaría el formulario y destruiría el
               control que el usuario acaba de tocar: en un texto se perdería
               el cursor, y en un `<select>` el foco saltaría fuera justo
               después de elegir una opción. Es la misma causa del defecto
               del buscador. Los controles no están gobernados por el estado;
               la validación se ejecuta al guardar, que sí repinta. */
            alCambiar: function (evento) {
              E.obtener().edicion.borrador[definicion.nombre] = evento.target.value;
            },
            alEscribir: function (evento) {
              E.obtener().edicion.borrador[definicion.nombre] = evento.target.value;
            }
          });
        }))
      ]);
    });
  }

  function renderConflicto(estado) {
    if (!estado.conflicto) return null;

    return el("div", { clase: "mf-banda mf-banda--conflicto", attrs: { role: "alert" } }, [
      el("div", { clase: "mf-banda-texto" }, [
        el("p", { clase: "mf-banda-mensaje", texto: "Conflicto de versión" }),
        el("p", { clase: "mf-banda-detalle", texto: estado.conflicto.mensaje })
      ]),
      U.boton({
        texto: "Recargar folio",
        variante: "primario",
        alHacerClic: function () { recargarDetalle(); }
      })
    ]);
  }

  function renderAccionesDetalle(estado) {
    var cap = estado.detalle.capacidades || {};
    var enConflicto = !!estado.conflicto;
    var acciones = [];

    if (estado.edicion.activa) {
      acciones.push(U.boton({
        texto: estado.edicion.enviando ? "Guardando…" : "Guardar cambios",
        variante: "primario",
        deshabilitado: estado.edicion.enviando || enConflicto,
        alHacerClic: guardarEdicion
      }));
      acciones.push(U.boton({
        texto: "Cancelar edición",
        variante: "secundario",
        deshabilitado: estado.edicion.enviando,
        alHacerClic: cancelarEdicion
      }));
      return acciones;
    }

    if (cap.puedeEditar) {
      acciones.push(U.boton({ texto: "Editar", variante: "primario", deshabilitado: enConflicto, alHacerClic: iniciarEdicion }));
    }
    if (cap.puedeCerrar) {
      acciones.push(U.boton({
        texto: "Cerrar folio",
        variante: "secundario",
        deshabilitado: enConflicto,
        alHacerClic: function () {
          dialogoConMotivo({
            titulo: "Cerrar folio",
            descripcion: "Al cerrar, el folio deja de aceptar ediciones, comentarios y evidencias. El motivo es opcional y queda en la trazabilidad.",
            motivoRequerido: false,
            textoConfirmar: "Cerrar folio",
            alConfirmar: function (motivo) { ejecutarCambioEstatus(C.ACCIONES_ESTATUS.CERRAR, motivo); }
          });
        }
      }));
    }
    if (cap.puedeCancelar) {
      acciones.push(U.boton({
        texto: "Cancelar folio",
        variante: "secundario",
        deshabilitado: enConflicto,
        alHacerClic: function () {
          dialogoConMotivo({
            titulo: "Cancelar folio",
            descripcion: "La cancelación exige motivo. El folio se conserva y sigue participando en la validación de duplicados.",
            motivoRequerido: true,
            textoConfirmar: "Cancelar folio",
            alConfirmar: function (motivo) { ejecutarCambioEstatus(C.ACCIONES_ESTATUS.CANCELAR, motivo); }
          });
        }
      }));
    }
    if (cap.puedeReabrir) {
      acciones.push(U.boton({
        texto: "Reabrir folio",
        variante: "secundario",
        deshabilitado: enConflicto,
        alHacerClic: function () {
          dialogoConMotivo({
            titulo: "Reabrir folio",
            descripcion: "La reapertura exige motivo y queda registrada en la trazabilidad.",
            motivoRequerido: true,
            textoConfirmar: "Reabrir folio",
            alConfirmar: function (motivo) { ejecutarCambioEstatus(C.ACCIONES_ESTATUS.REABRIR, motivo); }
          });
        }
      }));
    }
    if (cap.puedeReasignar) {
      acciones.push(U.boton({
        texto: "Reasignar",
        variante: "secundario",
        deshabilitado: enConflicto,
        alHacerClic: dialogoReasignacion
      }));
    }

    return acciones;
  }

  function renderComentarios(estado) {
    var cap = estado.detalle.capacidades || {};

    var lista = estado.detalle.comentarios.length
      ? el("ol", { clase: "mf-comentarios" }, estado.detalle.comentarios.map(function (c) {
          return el("li", { clase: "mf-comentario" }, [
            el("div", { clase: "mf-comentario-meta" }, [
              el("span", { clase: "mf-comentario-autor", texto: U.textoODefecto(c.autorPersona) }),
              el("time", {
                clase: "mf-comentario-fecha",
                texto: U.fechaHora(c.fechaComentario),
                attrs: { datetime: c.fechaComentario }
              })
            ]),
            c.comentarioReferenciadoId
              ? el("p", { clase: "mf-comentario-referencia", texto: "Corrige al comentario " + c.comentarioReferenciadoId })
              : null,
            el("p", { clase: "mf-comentario-texto", texto: c.comentario })
          ]);
        }))
      : U.mensajeVacio("Este folio no tiene comentarios.");

    return el("section", { clase: "mf-seccion", attrs: { "aria-labelledby": "mf-sec-comentarios" } }, [
      el("div", { clase: "mf-seccion-encabezado" }, [
        el("h2", { id: "mf-sec-comentarios", clase: "mf-seccion-titulo", texto: "Comentarios" }),
        cap.puedeComentar
          ? U.boton({ texto: "Agregar comentario", variante: "secundario", alHacerClic: dialogoComentario })
          : null
      ]),
      el("p", { clase: "mf-seccion-nota", texto: "Los comentarios son permanentes: no se editan ni se eliminan." }),
      lista
    ]);
  }

  function renderEvidencias(estado) {
    var cap = estado.detalle.capacidades || {};

    var lista = estado.detalle.evidencias.length
      ? el("ul", { clase: "mf-evidencias" }, estado.detalle.evidencias.map(function (ev) {
          var capEv = ev.capacidades || {};
          var vigente = ev.estadoEvidencia === C.ESTADOS_EVIDENCIA.VIGENTE;

          return el("li", { clase: "mf-evidencia" }, [
            el("div", { clase: "mf-evidencia-datos" }, [
              el("p", { clase: "mf-evidencia-nombre", texto: ev.nombreArchivo }),
              el("p", { clase: "mf-evidencia-meta" }, [
                el("span", {
                  clase: "mf-pildora mf-pildora--evidencia-" + (vigente ? "vigente" : ev.estadoEvidencia === C.ESTADOS_EVIDENCIA.INVALIDA ? "invalida" : "sustituida"),
                  texto: ev.estadoEvidencia
                }),
                el("span", { texto: " · " + U.fechaCorta(ev.fechaCarga) + " · " + U.textoODefecto(ev.autorPersona) })
              ]),
              ev.motivoOperacion ? el("p", { clase: "mf-evidencia-motivo", texto: "Motivo: " + ev.motivoOperacion }) : null,
              ev.evidenciaSustitutaId ? el("p", { clase: "mf-evidencia-vinculo", texto: "Sustituida por la evidencia " + ev.evidenciaSustitutaId }) : null,
              ev.evidenciaAnteriorId ? el("p", { clase: "mf-evidencia-vinculo", texto: "Sustituye a la evidencia " + ev.evidenciaAnteriorId }) : null
            ]),
            el("div", { clase: "mf-evidencia-acciones" }, [
              (cap.puedeCargarEvidencia && capEv.puedeInvalidar) ? U.boton({
                texto: "Invalidar",
                variante: "secundario",
                etiquetaAccesible: "Invalidar la evidencia " + ev.nombreArchivo,
                alHacerClic: function () {
                  dialogoConMotivo({
                    titulo: "Invalidar evidencia",
                    descripcion: "El archivo se conserva. Solo cambia su estado a Inválida y queda el motivo en la trazabilidad.",
                    motivoRequerido: true,
                    textoConfirmar: "Invalidar",
                    alConfirmar: function (motivo) { ejecutarInvalidacion(ev.evidenciaItemId, motivo); }
                  });
                }
              }) : null,
              (cap.puedeCargarEvidencia && capEv.puedeSustituir) ? U.boton({
                texto: "Sustituir",
                variante: "secundario",
                etiquetaAccesible: "Sustituir la evidencia " + ev.nombreArchivo,
                alHacerClic: function () {
                  dialogoEvidencia({
                    titulo: "Sustituir evidencia",
                    descripcion: "Se conservan ambos documentos: el anterior queda como Sustituida y el nuevo como Vigente.",
                    pedirMotivo: true,
                    textoConfirmar: "Sustituir",
                    alConfirmar: function (archivo, motivo) { ejecutarSustitucion(ev.evidenciaItemId, motivo, archivo); }
                  });
                }
              }) : null
            ])
          ]);
        }))
      : U.mensajeVacio("Este folio no tiene evidencias registradas.");

    return el("section", { clase: "mf-seccion", attrs: { "aria-labelledby": "mf-sec-evidencias" } }, [
      el("div", { clase: "mf-seccion-encabezado" }, [
        el("h2", { id: "mf-sec-evidencias", clase: "mf-seccion-titulo", texto: "Evidencias" }),
        cap.puedeCargarEvidencia ? U.boton({
          texto: "Cargar evidencia",
          variante: "secundario",
          alHacerClic: function () {
            dialogoEvidencia({
              titulo: "Cargar evidencia",
              descripcion: "El documento se agrega a la carpeta del folio y queda como Vigente.",
              pedirMotivo: false,
              textoConfirmar: "Cargar",
              alConfirmar: function (archivo) { ejecutarCargaEvidencia(archivo); }
            });
          }
        }) : null
      ]),
      el("p", { clase: "mf-seccion-nota", texto: "Las evidencias no se eliminan. Pueden invalidarse o sustituirse, y siempre se conserva el documento original." }),
      lista
    ]);
  }

  function renderTrazabilidad(estado) {
    var cap = estado.detalle.capacidades || {};
    if (!cap.puedeVerTrazabilidad) return null;

    var contenido = estado.detalle.trazabilidad.length
      ? el("ol", { clase: "mf-traza" }, estado.detalle.trazabilidad.map(function (t) {
          return el("li", { clase: "mf-traza-evento" }, [
            el("div", { clase: "mf-traza-meta" }, [
              el("span", { clase: "mf-traza-tipo", texto: t.tipoEvento }),
              el("time", { clase: "mf-traza-fecha", texto: U.fechaHora(t.fechaEvento), attrs: { datetime: t.fechaEvento } })
            ]),
            el("p", { clase: "mf-traza-actor", texto: U.textoODefecto(t.actorPersona) }),
            t.camposModificados ? el("p", { clase: "mf-traza-detalle", texto: "Campos: " + t.camposModificados }) : null,
            (t.estadoAnterior || t.estadoNuevo)
              ? el("p", { clase: "mf-traza-detalle", texto: U.textoODefecto(t.estadoAnterior) + " → " + U.textoODefecto(t.estadoNuevo) })
              : null,
            t.motivo ? el("p", { clase: "mf-traza-detalle", texto: "Motivo: " + t.motivo }) : null
          ]);
        }))
      : el("div", {}, [
          U.mensajeVacio("La trazabilidad no se ha cargado para este folio."),
          U.boton({
            texto: "Cargar trazabilidad",
            variante: "secundario",
            alHacerClic: function () { abrirDetalle(estado.detalle.folioItemId, true); }
          })
        ]);

    return el("section", { clase: "mf-seccion", attrs: { "aria-labelledby": "mf-sec-traza" } }, [
      el("h2", { id: "mf-sec-traza", clase: "mf-seccion-titulo", texto: "Trazabilidad" }),
      contenido
    ]);
  }

  function renderDetalle(estado) {
    var folio = estado.detalle.folio;
    if (!folio) return U.mensajeVacio("No hay ningún folio abierto.");

    return el("div", { clase: "mf-detalle" }, [
      el("nav", { clase: "mf-migas", attrs: { "aria-label": "Ruta dentro de Mis Folios" } }, [
        U.boton({ texto: "← Volver al listado", variante: "enlace", alHacerClic: volverAlListado })
      ]),
      el("div", { clase: "mf-encabezado" }, [
        el("div", {}, [
          el("h1", { clase: "mf-titulo", id: "mf-detalle-titulo", attrs: { tabindex: "-1" } }, [
            "Folio ", folio.folio
          ]),
          el("p", { clase: "mf-subtitulo" }, [
            U.pildoraEstatus(folio.estatusInterno),
            el("span", { texto: " · " + U.textoODefecto(folio.tipoGestion) + " · " + U.textoODefecto(folio.tipoAtencion) }),
            el("span", {
              clase: "mf-version",
              texto: " · versión de negocio " + U.textoODefecto(estado.detalle.versionNegocio)
            })
          ])
        ]),
        el("div", { clase: "mf-acciones" }, renderAccionesDetalle(estado))
      ]),
      renderConflicto(estado),
      renderIdentificacion(folio)
    ].concat(
      estado.edicion.activa ? renderOperativosEdicion(estado) : renderOperativosLectura(folio)
    ).concat([
      renderComentarios(estado),
      renderEvidencias(estado),
      renderTrazabilidad(estado)
    ]));
  }

  /* ---------- Render raíz ---------- */

  function asegurarRegiones(contenido) {
    if (montaje.contenedorAviso && montaje.contenedorVista) return;

    U.vaciar(contenido);
    montaje.contenedorAviso = el("div", { attrs: { "data-mf-aviso": "" } });
    montaje.contenedorVista = el("div", { attrs: { "data-mf-vista": "" } });
    contenido.appendChild(montaje.contenedorAviso);
    contenido.appendChild(montaje.contenedorVista);
    montaje.vista = null;
  }

  function renderAviso(estado) {
    U.vaciar(montaje.contenedorAviso);
    if (!estado.errorGlobal) return;

    montaje.contenedorAviso.appendChild(U.bandaError({
      mensaje: estado.errorGlobal.mensaje,
      alReintentar: estado.errorGlobal.reintentable
        ? function () { E.obtener().vista === "detalle" ? recargarDetalle() : cargarListado(); }
        : null,
      alCerrar: function () { E.actualizar({ errorGlobal: null }); }
    }));
  }

  function render(estado) {
    if (!raiz) return;

    /* Se conserva el contenedor y se reemplaza su contenido, no el nodo:
       la región `aria-live` del anunciador vive fuera de este subárbol y
       debe sobrevivir a cada repintado para que sus cambios se anuncien. */
    var contenido = raiz.querySelector("[data-mf-contenido]");
    if (!contenido) return;

    asegurarRegiones(contenido);
    renderAviso(estado);

    /* Cambio de pantalla: se reconstruye entera. Es el único caso en que
       destruir el árbol es correcto, porque el usuario no está editando
       nada dentro de la pantalla que se abandona. */
    if (montaje.vista !== estado.vista) {
      montaje.vista = estado.vista;
      montaje.resultados = null;
      montaje.alcance = null;
      montaje.subtitulo = null;
      montaje.controlesFiltro = null;

      U.vaciar(montaje.contenedorVista);
      montaje.contenedorVista.appendChild(
        estado.vista === "detalle" ? renderDetalle(estado) : renderListado(estado)
      );
      return;
    }

    /* Misma pantalla: actualización parcial. En el listado se repinta solo
       la región de resultados; la barra de filtros conserva sus nodos, y con
       ellos el foco, el cursor y la selección. */
    if (estado.vista === "listado") {
      actualizarEncabezado(estado);
      if (montaje.resultados) pintarResultados(estado, montaje.resultados);
      return;
    }

    U.vaciar(montaje.contenedorVista);
    montaje.contenedorVista.appendChild(renderDetalle(estado));
  }

  /* ---------- Montaje ---------- */

  function montar(contenedor, opciones) {
    /* Un montaje sobre otro dejaría viva la suscripción anterior, y el
       store llamaría a `render` una vez por cada montaje acumulado. Se
       cancela la previa antes de crear la nueva. */
    if (desuscribir) desuscribir();
    cancelarBusqueda();
    reiniciarMontaje();

    raiz = contenedor;
    U.vaciar(raiz);

    raiz.appendChild(el("div", { clase: "mf-modulo", attrs: { "data-mf-contenido": "" } }));
    anunciar = U.anunciador(raiz);

    desuscribir = E.suscribir(render);

    var perfil = (opciones && opciones.perfilSesion) || null;
    E.actualizar({ perfilSesion: perfil });

    return S.consultarUsuariosAsignables().then(function (r) {
      if (r.ok) E.actualizar({ usuariosAsignables: r.datos.usuarios });
      return cargarListado();
    });
  }

  function desmontar() {
    /* Se desuscribe primero: `E.reiniciar()` notifica, y sin cancelar la
       suscripción el render se ejecutaría sobre un contenedor que ya se
       vació. */
    if (desuscribir) {
      desuscribir();
      desuscribir = null;
    }

    /* Un temporizador pendiente dispararía una consulta sobre un módulo ya
       desmontado. Se cancela antes de soltar las referencias. */
    cancelarBusqueda();
    componiendoEntrada = false;
    reiniciarMontaje();

    if (raiz) U.vaciar(raiz);
    raiz = null;
    anunciar = function () {};
    E.reiniciar();
  }

  global.ATCMisFoliosPagina = Object.freeze({
    montar: montar,
    desmontar: desmontar,
    render: render,
    /* Expuestas para el arnés de verificación y las pruebas estructurales. */
    _acciones: {
      cargarListado: cargarListado,
      abrirDetalle: abrirDetalle,
      volverAlListado: volverAlListado,
      iniciarEdicion: iniciarEdicion,
      guardarEdicion: guardarEdicion,
      cancelarEdicion: cancelarEdicion,
      limpiarFiltros: limpiarFiltros,
      aplicarBusqueda: aplicarBusqueda,
      GRUPOS_OPERATIVOS: GRUPOS_OPERATIVOS,
      DEBOUNCE_BUSQUEDA_MS: DEBOUNCE_BUSQUEDA_MS
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
