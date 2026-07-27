  /* Interpreta la fecha capturada como hora fija de México (UTC-6, SIN horario de verano)
    y la convierte al instante UTC real (con Z). Así no depende de la zona del navegador
    ni del DST. SharePoint (configurado en Central America, UTC-6 fijo) la muestra igual. */
  function fechaMX(v){
    if(!v) return "";
    const conSeg = v.length === 16 ? v + ":00" : v;      // agrega segundos si faltan
    const d = new Date(conSeg + "-06:00");               // fuerza UTC-6 fijo
    return isNaN(d.getTime()) ? "" : d.toISOString();     // -> "YYYY-MM-DDTHH:MM:SS.sssZ"
  }
