  function escaparCSV(v){
    if(v === null || v === undefined) v = "";
    v = String(v);
    if(/[",\n\r]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
    return v;
  }

  function construirCSV(filas, columnas){
    const head = columnas.map(c => escaparCSV(ETIQUETAS_REPORTE[c] || c)).join(",");
    const body = filas.map(f => columnas.map(c => escaparCSV(f[c])).join(",")).join("\r\n");
    return "﻿" + head + "\r\n" + body; // BOM para que Excel respete los acentos.
  }
