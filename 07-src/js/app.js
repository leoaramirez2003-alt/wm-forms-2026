  /* ================================================================
    1. CONFIGURACIÓN
    ================================================================ */

  const FLOW_URL = "https://defaultabb9b2bf39d446218be853022aab1a.b4.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/45625e22e4be4cfaa5c138e24475e972/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=kfn5GbjGNTG9tVo1xmYJo3V6awDU0aP8nxE4_8burRw";

  const GESTORES = [
    { nombre: "MEJIA LEON HUGO ALEJANDRO",        correo: "hmejia@weemedic.com"  },
    { nombre: "PEÑA JAIMES JAVIER ALEJANDRO",     correo: "jpena@weemedic.com"   },
    { nombre: "VALDES CASTAÑEDA MARIA FERNANDA",  correo: "mvaldes@weemedic.com" },
    { nombre: "ZAMUDIO GALINDO PAULINA",          correo: "pzamudio@weemedic.com"},
    { nombre: "CASAS CANELA ALEXIS",              correo: "acasas@weemedic.com" },
  ];

  /* ===== Multicliente v1 (2026-07-14) =====
     Cliente explícito y OBLIGATORIO. Eliminada la regla "Tipo_Gestion vacío = Banorte":
     Banorte ahora viaja como literal "Banorte" en el payload. */
  const CLIENTE_STORAGE_KEY = "atc_cliente";  /* solo guarda el valor del catálogo, sin PII */

  /* HC general por campaña para Sura / General de Salud (activos, sin BAJA) */
  const HC_SGS_ACTIVOS = {
    "General de Salud": [
      "MONTOYA TREJO DAYANNE CLAUDIA","DOMINGUEZ LOPEZ JOSAFATH","CHAVEZ MARTINEZ GUILLERMO",
      "FUENTES HERNANDEZ ALICIA GRISEL","GONZALEZ HERNANDEZ JESSICA","JUAREZ MONTUY YURITZY DE JESUS",
      "ROBLES AGUILAR VALERIA","ROSENDO LOPEZ MARCO ANTONIO","PEREZ GAYTAN CINTYA CAROLINA",
      "MEDINA AGUILAR DAVID EDUARDO","MEDINA PEREZ IVAN","ESPINOSA MADRIGAL ROSA MARIA ALEJANDRA",
      "APARICIO SANCHEZ RAFAEL","PEREZ ALMARAZ BEATRIZ","HUERTA ROMERO KAREN DANIELA",
      "MEJIA BOISO NANCY NOEMI","CAMPIRAN MILLAN BRYAN","MARTINEZ ESCOBAR KARYME ARLETH",
      "ALCANTARA SANTANA CITLALLI ANALI","SANCHEZ SANDOVAL LILIANA","ARCE CRUZ CAROLINA",
      "HIDALGO GALEANA ERIKA MONSERRAT","MARTINEZ MONROY NANCY","MORALES TLAHUEL ANGELICA YARENIS",
      "CUEVAS ROJO NADIA EVELYN","ALVAREZ GUERRERO ROXANA ALEXANDRA","ROJAS ROLDAN ANA ISABEL",
      "OLVERA ESQUIVEL ALAN EDUARDO","ZUÑIGA LUGO GERARDO","ESTEVEZ VARELA JESSICA GUADALUPE",
      "MIRANDA RODRIGUEZ LUIS ANGEL","SANDOVAL OROZCO MARCO ANTONIO","AVILA MEDINA LUIS ROBERTO",
      "GOMEZ CASAÑAS DANIEL MARTIN","MOLINA CRUZ DIANA MIRELL","SANDOVAL PEÑA DIEGO",
      "BARRANCO PEREZ VIRIDIANA","CARDOSO YAÑEZ KARLA AISBEL","DIAZ CRUZ BRIAN DANIEL",
      "GARCIA TRUJILLO OLIVIA","LARA ADAM ALEXIS YAEL","SEGURA CASTILLO ALEXIS",
      "PIMIENTA RUIZ JOSE ANTONIO","SILVA REYES LILIANA","LOPEZ HERNANDEZ GABRIELA",
      "SANTIBAÑEZ MORENO EMMANUEL"
    ],
    "Sura": [
      "CASTILLO RAMIREZ ISAIAS","VARGAS RODRIGUEZ GUADALUPE","CASTRO HERNANDEZ SANDRA IVONNE",
      "ACOSTA ROJAS DANIELA","CRUZ SANTOYO CARLOS FERNANDO","MARTINEZ MARTINEZ MARIA HERMINIA",
      "CASAS CANELA ALEXIS","VEGA GALAVIZ DIANA","PANAMA SOTO MARIANA","REYES ROMERO MARIO ALBERTO",
      "ARREDONDO ARCE ENRIQUE ADRIAN","SILICEO VILLALOBOS ANDREA SHERLYN","MARTINEZ LOPEZ DANIEL ANGEL",
      "RODRIGUEZ PADILLA FERNANDA"
    ]
  };

  /* ☐ PENDIENTE: pegar aquí el catálogo completo de General de Salud (uno por línea).
     El código lo limpia y deduplica solo. Mientras esté vacío, GS solo ofrece "Otro". */
  const CONTRATANTES_GS_RAW = `
SINDICATO DE TELEFONISTAS DE LA REPUBLICA MEXICANA
RADIALL OBREGON S DE RL DE CV
INDIVIDUAL
RUBA DESARROLLOS SA DE CV
SIGMA ALIMENTOS CORPORATIVO S.A. DE C.V.
BIMBO SA DE CV
MAQUILAS TETAKAWI S.A. DE C.V.
CORPORATIVO BIMBO S.A DE C.V
M3 MEXICANA S DE RL DE CV
PROVYN PROTECCION EN VIDA Y NEGOCIOS SC
SKYWORKS SOLUTIONS DE MEXICO S DE RL DE CV
CREA MAS CAPITAL SAPI DE CV SOFOM ENR
CAJA GONZALO VEGA SC DE AP DE RL DE CV
BARCEL S.A. DE C.V.
NEMAK MEXICO SA DE CV
CATEDRATICOS Y PROFESIONISTAS ASOCIADOS EN SEGUROS S DE RL DE CV
VANGTEL MEXICO SA DE CV
EZQUALO LABORATORIO CREATIVO SA DE CV
SACTI ASOCIADOS SA DE CV
SINDICATO NACIONAL DE TRABAJADORES DE LA EDUCACION
VALAGRO MEXICANA SA DE CV
AVIADA SA DE CV
ZOBELE MEXICO S.A. DE C.V.
MUNDO DULCE S.A. DE C.V.
GARRETT MOTION MEXICO SA DE CV
MEXICOLVEN SA DE CV
KENWORTH MEXICANA S.A. DE C.V.
INTERIORES AEREOS SA DE CV
M.A. COOLEY Y ASOCIADOS SC
SUPER TRANSPORTES HMG SA DE CV
MASTER LOCK DE NOGALES S.A. DE C.V.
PACCAR FINANCIAL MEXICO SA DE CV
SONITRONIES S DE RL DE CV
UNIVERSIDAD TECNOLOGICA DE SALAMANCA
M3 S DE RL DE CV
CARLISLE INTERCONNECT TECHNOLO GIES DE MEXICO S D E RL DE CV
BCM SERVICES DE MEXICO S. DE R.L. DE C.V.
ITW EAE MEXICO S DE RL DE CV
BECTON DICKINSON INFUSION THERAPY SYSTEMS INC. S.A. DE C.V.
PRACAME SA DE CV
JAS FORWARDING DE MEXICO SA DE CV
COMISION FEDERAL DE ELECTRICIDAD
24/7 GRUPO DE SEGURIDAD PRIVADA S. DE R.L.
ABENT 3T SOCIEDAD ANONIMA PROMOTORA DE INVERSION DE CAPITAL VARIABLE
OPTNSVC MEXICO S DE RL DE CV
AVANTEC PERFORMANCE CHEMICALS MEXICO SA DE CV
ACOSTA OLIVAS Y ASOCIADOS S.C.
MINERA CAMINO ROJO SA DE CV
ACCUTEC DE MEXICO S DE RL DE CV
ASESORIAS MERCANTILES DE NOGALES S.C.
EDS MFG MEXICO S DE RL DE CV
ENTRENAMIENTO EMPRESARIAL EFECTIVO SC
DEVISE IS SA DE CV
ITT CANNON DE MEXICO SA DE CV
TRANSREX, S.A DE C.V.
HYL TECHNOLOGIES SA DE CV
WEESYSTEMS SAPI DE CV
MANTENIMIENTO CONTROL Y PROYECTOS SA DE CV
O&M HALYARD MEXICO S. DE R.L. DE C.V.
MASTER LOCK MEXICANA SA DE CV
CONSOLIDATED PRECISION PRODUCTS S DE RL DE CV
BELDEN DE SONORA S DE RL DE CV
INFONAVIT
EDM NETWORK DE MEXICO SA DE CV
TRANSPORTES PITIC SA DE CV
JAVID DE MEXICO S DE RL DE CV
EVENTOS TERSO SA DE CV
CELLUCAP DE MEXICO SA DE CV
THE INTEC GROUP INC
CURTISSWRIGHT CONTROLS DE MEXICO SA DE CV
OFFSHORE INTERNATIONAL INC
TMLC SAFES SA DE CV
ANCHOR TOOL AND PLASTIC DE MEXICO SA DE CV
VICTOR EQUIPMENT DE MEXICO SA DE CV
NORTH AMERICAN PRODUCTION SHARING DE MEXICO SA DE CV
KC AFC MANUFACTURING S DE R L DE CV
GORILLA NATION MEXICO S DE RL DE CV
WEISER LOCK MEXICO S. DE R.L. DE C.V.
INMOBILIARIA DEL MAR SA DE CV
HEMAC TELEINFORMATICA SA DE CV
LEGACY D1 SERVICIOS SA DE CV
PENCOM CSS DE MEXICO S DE RL DE CV
CORTEZ TRANSFERT S DE RL D E CV
LA ADA DE ACU�A S DE RL DE CV
ILS SERVICIOS LOGISTICOS SA DE CV
AUTO TRANSPORTADORA GENESIS SA DE CV
CHASE YOUR DREAMS HOLDINGS
GENERAL DE SEGUROS SA
WATTS WATER TECHNOLOGIES LATIN AMERICA S.A. DE C. V.
HOME DEPOT MEXICO S DE RL DE CV
ALBERGUE INDUSTRIAL DE NOGALES S DE RL DE CV
AGUA INDUSTRIAL DE MONTERREY S DE U
AMPHENOL ALDEN PRODUCTS MEXICO SA DE CV
LEGO OPERACIONES DE MEXICO S.A. DE C.V.
MU�OZ C Y ASOCIADOS SA DE CV
HYL SERVICES SA DE CV
PLASTICOS Y ALAMBRES SA DE C V
SONORA S PLAN S DE RL DE CV
AVENT S. DE R.L. DE C.V.
SERVICIOS ADMINISTRATIVOS TETAKAWI SA DE CV
OBLA COMERCIAL SA DE CV
3009474 US WIRE GROUP S DE RL DE CV,
MAQUILAS TETAKAWI SA DE CV
MKS INSTRUMENTS MEXICO S DE RL DE CV
ARQUIDIOCESIS DE LEON AR
LEGO OPERACIONES DE MEXICO SA DE CV
SERVICIOS INTEGRALES NOVA DE MONTERREY S.A. DE C.V.
GENERAL DE SALUD COMPA�IA DE SEGUROS SA
RAMOS AGUAYO Y ASOCIADOS S.A. DE C.V.
SONIA YESSICA ARELLANO SANCHEZ
ARMANDO REYNOSO ESTRADA
JUAN CARLOS GOMEZ HERNANDEZ
MARIA DE JESUS AGUAYO HERNANDEZ
ILIANA RUTH CARRILLO GARIBALDI
EFREN EUGENIO CHAGOLLA VILLASE�OR
EDMUNDO TELLO WELSH
JESUS MARIO HERNANDEZ VALENZUELA
NORIKO VIVIANA LAMAS VILLANUEVA
MANUEL ANTONIO OLAIS FERNANDEZ
JESUS ANTONIO NAVA ORTIZ
MARTIN FERNANDO CORONA QUEVEDO
OMAR RAMIREZ DIAZ
GUILLERMO AGUILAR RIZO
ROSA KANAN DABBAH
ADRIANA HUERTA PADILLA
ESTEFANIA TORRES PICOS
JOSE MANUEL HERNANDEZ RIVERA
ROCIO ELIZABETH CORTES RUBIO
LILIANA CRISTINA MESA GONZALEZ
CRISTINA NEGRETE SAAVEDRA
JOSE LUIS VALLE CANALES
0-AGENTE DIRECTO .
ANA PAOLA MERCADO CRUZ
JORGE ALBERTO FELIX NAVARRO
FRANCISCO JAVIER LOPEZ AHUMADA
RAFAEL ANTONIO CRUZ MIRANDA
JOSE ROBERTO MEDINILLA SALDA�A
OSVALDO MELQUIADES ORTIZ OCHOA
LUIS FERNANDO OVIEDO LUCERO
SABINA BECERRA
GRAND INSURANCE SOLUTIONS SC
OMAR FLORES NEVAREZ
MARIA LAURA AHUMADA CARRILLO
MIGUEL MENDEZ GONZALEZ
GUILLERMO FEHR LOEWEN
ITJUANA S DE RL DE CV
GENERAL DE SEGUROS
LUIS GERARDO SANCHEZ PELAYO
FRANCISCO ANTONIO MENDEZ GARCIA
CELINA ARACELI ZAMORA SALCEDO
MAURICIO JAVIER ZU�IGA FLORES
MAURICIO MARCELO CORONA QUEVEDO
JUAN ARMENDARIZ GARCIA
JOSE LE�N ESPINOZA BENAVIDEZ
JORGE ENRIQUE GAONA MARMOLEJO
MEDARDO CHAVEZ SANCHEZ
RODRIGO PAMPLONA MEDINA
LUIS MIGUEL OLIVAREZ CHAVEZ
SERVICIOS SACUPE SA DE CV
MARIA AMPARO RIOS GOMEZ
JESUS CARLOS DAVILA DAVILA
HERMELINDA MARQUEZ RIVERA
MARIA GUADALUPE MORENO GONZALEZ
JOSE RAMON CHAIREZ FIGUEROA
JAIME ALBERTO GARZA VELA
CHAGOLLA VILLASE�OR EFREN EUGENIO
JACQUELINE LOPEZ RUBIO
HAZAEL GOMEZ ENCINAS
JORGE JESUS SIFUENTES GARCIA
SONORA BUSINESS CONSULTANTS SC
VIANEY ALEJANDRA MORENO VENEGAS
GUSTAVO PUENTE NAVA
ESTHER CHAPARRO CANO
TORRES GUZMAN JOSE PANFILO
10807-JS GRUPO CONSULTORES SEGUROS S.A. DE C.V.
LILIAN ANEL SALAS OJEDA
ARISUE Y ASOCIADOS S.C
MARIA FERNANDA ROMERO GALAZ
5084-ERNESTO REDING GARNICA
MARTHA ELENA CASTA�EDA NU�EZ
JULIETA DE LA LUZ HERNANDEZ AGUIRRE
RAMIREZ INGENIEROS Y ARQUITECTOS S DE RL DE CV
MARCELA MARIA OBREGON TOBIAS
ALMA DELIA SOLIS DAVILA
ADMINISTRADORES DE MAQUILA S DE RL DE CV
OCTAVIO RAMIREZ TAPIA
FELIPE FRANCISCO CACHO CASTELLANOS
HECTOR EDUARDO HERNANDEZ PEREZ
GUARDERIA VECINAL COMUNITARIA MAQUILA TETAKAWI SC
GABRIELA GUADALUPE SALDA�A GARCES
CHRISTIAN ALFREDO VARGAS CONTRERAS
MARIA TERESA ARIAS BARRERA
MANUEL AGUILAR OLIVARES
ANNIE MERAB MARQUEZ TORRES
MARIA GUADALUPE VILLALOBOS LOZANO
JOS� MART�N NAVA VELARDE
MICHELLE FERNANDA CHAVEZ VELEZ
ALFREDO URBINA RODRIGUEZ
JOSE MANUEL ARRATIA LUGO
JOSE LUIS MELENDEZ MEDINA
MESA GONZALEZ LILIANA CRISTINA
FRANCISCO JAVIER FIGUEROA LOPEZ
6132-MA.DEL CARMEN ESPINOSA MARTINEZ
PROMARSA DEL CENTRO SA DE CV
MARCO ANTONIO FARIAS DE LA MORA
ERNESTO JAUREGUI GASCON
DANIELA AGUILAR ZAMORA
AGUILAR RIZO GUILLERMO
GARCIA OCHOA JORGE ISRAEL
ROSA MARIA MARTINEZ VAZQUEZ
MARCO RUGGERO MAGGIANI IBARRA
JAMES DAWSON STOUT MELLARS DICKSON
ALFONSO CHACON MIJARES
MS DE RL DE CV
SERVICIOS COPRIPE SA DE CV
ELBA GRACIELA CARRILLO SEPULVEDA
MEJIA ANAYA GUILLERMINA
MARTHA ELENA CASTA�EDA NU�EZ
FRANCISCO JAVIER FIGUEROA LOPEZ
MARIA CRISTINA SANCHEZ NAVARRO
MARCO ANTONIO ZAMUDIO VEGA
1875-SALVADOR CERVANTES OROZCO
LOPEZ AHUMADA FRANCISCO JAVIER
NAVARRO LIZARRAGA EDUARDO
XOCHITL AIDEE TANORI ALVAREZ
NARDA MARIBEL MONTES ECHAURY
RICARDO ESPINOSA GONZALEZ
JUAN FRANCISCO CORONADO RENDON
GABRIELA JOFFROY ROMERO
RODRIGO MU�OZ GUTIERREZ
SAN JUANA ELIZABETH OVIEDO VARELA
MIGUEL CRUZ PUEBLA
SEBASTIAN ZU�IGA MENDOZA
CONSUELO ALBA�EZ ORNELAS
PAOLA KARINA PRECIADO ESPINOZA
ENRIQUE HUDSON ALCERRECA
TEREZA BECERRA
JORGE MANUEL VALADEZ CURIEL
SONIA YESSICA ARELLANO SANCHEZ
NELLY GUTIERREZ RAMOS
ELIDA GUEL FLORES
JOEL RAMIRO ATILANO PADILLA
RODRIGO PIETSCH RESENDIZ
GERARDO ADRIAN ARANDA MUNGUIA
FRESH MEAT MARKET SA DE CV
ENTRENAMIENTO EMPRESARIAL EFECTIVO SC
ELSA CRISTINA GONZALEZ LOPEZ
OMAR ALEJANDRO PADILLA ACEVES
VALENTIN LOYA BARRIO
HECTOR HUGO FERNANDEZ MARTINEZ
BERTHA ALICIA MIRELES ZAMORANO
CLAUDIO SERVIN OROZCO
LAURA MILAGROS GUTIERREZ MERY
TRANSREX SA DE CV
SALVADOR PEREZ AVILEZ
JULIO ADRIAN SOTO CARRAZCO
URI YAEL GOMEZ DIAZ
ESTHER PATI�O RUBIO
ASFALTOS GUADALAJARA SAPI DE CV
ANA YOLANDA RECIO CEPEDA
FLAVIA OCEGUERA NAVARRO
SERGIO SILVA DIAZ
M S DE RL DE CV
CLAUDIA LILIANA FONSECA GOMEZ
IBSAN CACERES ESPINOSA
VICTOR MANUEL PI�A SALAZAR
SERGIO FLORES CARRILLO
MERCEDES ZERTUCHE VALDEZ
PRODUCTOS QUIMICOS Y SOLUCIONES SA DE CV
IRVING ANTONIO MENDEZ PEQUE�O
AUTO SELECT EXCHANGE
HUGO AUGUSTO ARELLANO AVILA
MIGUEL ARMANDO RUIZ GARFIO
MONICA LIVIER HERNANDEZ SANDOVAL
YESSICA LILIANA CHAVEZ DOMINGUEZ
RUBEN JESUS DEL SOCORRO TAMEZ LOPEZ
CLAUDIA ALEJANDRA VALENCIA ALVAREZ
YENDI ELIZABETH CEBALLOS FLORES
RUBEN GONZALEZ CASTILLO
JUDITH ADRIANA FIGUEROA LOPEZ
JORGE ALATORRE DELGADO
TOMAS DANIEL RAMOS ASCENCIO
CACERES ESPINOSA IBSAN
CARMEN RAQUEL TORRES MIRANDA
SILVIA YAZMIN REYES ANTONIO
SASI SEGUROS S.A. DE C.V.
SERVI LLANTAS FELMAR SA DE CV
ARTURO GASCON ZAMORA
US WIRE GROUP S DE RL DE CV
ANTONIO LEDEZMA VELAZQUEZ
BLANCA JUDITH DIAZ DELGADO
11906-PABLO ARTURO SANCHEZ GARCIA
FERNANDO PONCE RUIZ
MARCO VINICIO DELGADO VALDES
ADRIANA ELENA TORRES ORDAZ
CALDERON ALARCON BRENDA
ILDEFONSO IGLESIAS ESCUDERO
FELIPE EUGENIO VILLARREAL FLORES
CATEDRATICOS Y PROFESIONISTAS ASOCIADOS EN SEGUROS S DE   RL DE CV
ANDERSON FORREST PRODUCTS DE NOGALES S DE RL DE CV
SALVAGNINI MEXICO S DE RL DE CV
COMET ELECTRIC, S. DE R.L. DE C.V.
JORGE GARCIA MARTINEZ
CARLOS ESDUARDO RODRIGUEZ TREVI�O
OPERADORA DE RENTAS DE PUERTO PE�ASCO SA DE CV
LUIS FRANCISCO FIERRO PARRA
HAYDEE SARAHY LOPEZ MARTINEZ
MARISOL RIVERA NU�EZ
CUAUHTEMOC MATAGARZA CASADOS
FRANCISCO CARLOS ESCOBELL AGUIRRE
OSCAR GONZALEZ DIAZ
AMPHENOL CABLE AND INTERCONNECT TECHNOLOGIES DE MEXICO S DE RL DE CV
EDUARDO FRANCO LOPEZ
8641-IVAN BARAJAS GUILLEN
JOSE MODESTO SILVA HERRERA
GUILLERMINA MEJIA ANAYA
ANA CELIA GARCIA LABASTIDA
ANGEL SEBASTIAN ALVAREZ GOMEZ
WESTMED DE MEXICO SA DE CV
LEONARDO ALEJANDRO DE ALBA SALAZAR
ANA MARICELA AYALA MEDINA
BRENDA CALDERON ALARCON
MARTIN GILBERTO MORENO VILLARREAL
6541-MIGUEL SALAS MOTIS
ADRIANA BERENICE HERNANDEZ RAMOS
MARIO ALBERTO LUJAN ANDUJO
0
POLIZA INDIVIDUAL
ANDERSON FORREST PRODUCTS DE NOGALES S DE RL DE CV
YVETTE ALEXANDRA SANCHEZ ZEPEDA
JOVITO MOISES ESPINOSA PANTIGA
AVENT S DE RL DE CV
CARLOS MARTINEZ ESPARZA
OSCAR ANDRES SANCHEZ LOBO
MARIO RIVERA GUTIERREZ
IRMA JUDITH BARRAZA ARELLANO
ALEJANDRO MARCELINO GOMEZ GUZMAN
MINERVA JUAREZ CRUZ
ERIK ALEJANDRO ZAMORA GAMBOA
ASESORIAS MERCANTILES DE NOGALES SC
FRANCISCO DE JESUS AMEZCUA CHAVEZ
GUADALUPE ISABEL OSORNO VILLAMIL
MONTSERRAT DE LA LUZ MOLINA BARAJAS
TISECK ASOCIADOS SA DE CV
AXEL ISRAEL LLAMAS GAMEZ
SINDICATO NACIONAL DE TRABAJADORES DE LA EDUCACION SECCION 8
SERVICIOS INTEGRALES NOVA DE MONTERREY SA DE CV
ELVIRA MARGARITA HERNANDEZ AGUIRRE
VERONICA JAQUEZ JUAREZ
SONIA PRIETO PORRAS
LUCIANO TORRES GARZA
5814-FRANCISCO JAVIER FIGUEROA LOPEZ
PRACAME, SA DE CV
ALEJANDRA SUCCAR ULLOA
FRANCISCO ALFONSO MORELOS ORDAZ
LETICIA VALADEZ RUIZ
JUAN MIGUEL ROBLES GONZALEZ
FELIPE LICANO CONTRERAS
ACEROS CALZADA SA DE CV
JAIME MAGDALENO ORNELAS
JUAN ANTONIO JAIME GUERRA GARCIA
LUIS ARMANDO GUTIERREZ FLORES
MARTA REBECA ZAMORA RODRIGUEZ
EDGAR CRISTIAN NAVARRO MEZA
RAMSES RODRIGUEZ RAMIREZ
INSTITUTO SUPERIOR DE AUDITORIA Y FISCALIZACION
INGENIEROS CONSULTORES ASOCIADOS SA
CORINA ESPINOZA GONZALEZ
JOSEFINA SARA CEBALLOS PIZARRO
MANUEL DE JESUS TANORI ERUNEZ
REPARACIONES REFRACTARIAS ANTIACIDAS Y MECANICAS DE TORREON, S.A. DE C
KISAFIX MEXICO S DE RL DE CV
ZUHEI ANNAI PORTALES OVIEDO
10475-SASI SEGUROS S.A. DE C.V.
RA�L ALEJANDRO GARCIA ASCENCIO
JUAN MANUEL ZAVALA CUEN
JESUS GUILLERMO BONILLAS ZEPEDA
RBC DE MEXICO SRL DE CV
JOSE LUIS RAZO FONSECA
AMPHENOL CABLE AND INTERCONNECT TECHNOLOGIESDE MEXICOS DE RL DE CV
FRANCISCO EDUARDO MARQUEZ RIVERA
RAFAEL RIVERA BRAMBILA
MARIA TERESA QUEVEDO ARREOLA
MARIA FERNANDA ROSALES DE LEON
LRENA VILLARREAL OSUNA
DIAZ GAS, S.A. DE C.V.
SILVIA LETICIA DIAZ CHAVEZ
HECTOR ALBERTO CORDOVA MENDOZA
RICARDO FABIAN HERNANDEZ AGUIRRE
BRUNDAGE MANAGEMENT MEXICO S DE RL DE CV
MIGUEL ANGEL YUBI ARMENDARIZ
ENTRETENIMIENTO EMPRESARIAL EFECTIVO SC
RICARDO BRAYAM ZAVALETA COSSIO
MEGA PERSONAL SC
AMPHENOL CABLE AND INTERCONNECT TECHNOLOGIES DE MEXICOS DE RL DE CV
WEISER LOCK MEXICO S DE RL DE CV
FRONTERA ALUMINIOS S. DE R.L. DE C.V.
MARIA PATRICIA TAHA ESPARZA
BADGER METER DE MEXICO SA D E CV
SOLUCIONES INTEGRADAS PARA LA INDUSTRIA GVG
ALVARO ULISES MOTA GONZALEZ
JAIME TREVI�O TREVI�O
RAUL JAUREGUI VERDIN
MARCELO SILLER CEPEDA
GUILLERMO JUAN QUINELLI
FATIMA ILIANA PIEDRA DE LEON
DAVID ALVAREZ GOMEZ
VERONICA JUDITH SOLIS GALLEGOS
LUBRICANTES JUGUER SA DE CV
ADMINISTRACION DE INMUEBLES RAMOS SA DE CV
JUDITH ASTRID PAREDES TORRES
IGNACIO VALLES GONZALEZ
EMETERIO FRANCO LOPEZ
ARMANDO ZAVALA SALAS
LUIS MARTIN BALBUENA QUEZADA
VICENTE RODRIGUEZ CORZO
LIZBETH SARMIENTO RAMIREZ
CARTONES Y EMPAQUES LUMELSA DE CV
Otras
DATATEL TRANSPORTADOR DE INFORMACION S.A. DE C.V.
CONSORCIO INDUSTRIAL MEXICANO DE AUTOPARTES S DE RL DE CV
BELDEN ELECTRONICS SA DE CV
OTRO
`;

  function limpiarTextoCatalogo(v){
    return String(v || "")
      .replace(/&amp;/g, "&")
      .replace(/[\t\r]+/g, " ")
      .trim()                       // quita espacios envolventes antes de las comillas
      .replace(/^"+|"+$/g, "")      // comillas envolventes
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizarClaveCatalogo(v){
    return limpiarTextoCatalogo(v)
      .toUpperCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  }

  function construirCatalogoGS(){
    const vistos = new Set();
    const salida = [];
    CONTRATANTES_GS_RAW.split("\n").forEach(linea => {
      let val = limpiarTextoCatalogo(linea);
      if(!val) return;
      const clave = normalizarClaveCatalogo(val);
      if(clave === "0") return;
      if(clave === "OTRAS" || clave === "OTRO"){ val = "Otro"; }
      const claveFinal = normalizarClaveCatalogo(val);
      if(vistos.has(claveFinal)) return;
      vistos.add(claveFinal);
      salida.push(val);
    });
    if(!salida.some(x => normalizarClaveCatalogo(x) === "OTRO")){ salida.push("Otro"); }
    return salida.sort((a,b) => a.localeCompare(b, "es"));
  }

  function cargarContratantes(){
    const tg = valor("Tipo_Gestion");
    const list  = document.getElementById("Contratante_List");
    const input = document.getElementById("Contratante");
    const hint  = document.getElementById("Contratante_Hint");
    if(!list || !input) return;

    const actual = input.value;
    list.innerHTML = "";

    let opciones = [];
    if(tg === "General de Salud"){
      opciones = construirCatalogoGS();
      input.placeholder = "Busca contratante de General de Salud…";
      if(hint) hint.textContent = "Busca y selecciona el contratante de General de Salud.";
    }else if(tg === "General de Salud Infonavit"){
      opciones = CONTRATANTES_GS_INFONAVIT;
      input.placeholder = "Selecciona contratante Infonavit…";
      if(hint) hint.textContent = "Catálogo propio de General de Salud Infonavit.";
    }else if(tg === "Sura"){
      opciones = [];
      input.placeholder = "Captura contratante de Sura…";
      if(hint) hint.textContent = "Captura el contratante de Sura como texto libre.";
    }else if(tg === "Banorte"){
      opciones = CONTRATANTES_BANORTE;
      input.placeholder = "Selecciona contratante…";
      if(hint) hint.textContent = "Selecciona el contratante Banorte.";
    }else{
      opciones = [];
      input.placeholder = "Selecciona primero el cliente…";
      if(hint) hint.textContent = "El catálogo de contratantes depende del cliente.";
    }

    opciones.forEach(op => {
      const option = document.createElement("option");
      option.value = op;
      list.appendChild(option);
    });

    // Al cambiar de campaña, limpiar el contratante para no arrastrar valores de otra
    if(actual && tg !== ultimoTipoGestionContratante){ input.value = ""; }
    ultimoTipoGestionContratante = tg;
  }

  /* Lista de analistas de Reclamos Reembolso — usada por el switch de Siniestralidad */
  const HC_PAGO_REEMBOLSO_ANALISTAS = [
    "VAZQUEZ ARELLANO DIANA CECILIA",
    "DE LA O QUIROZ JOSE ANTONIO",
    "FLORES PALAFOX PAMELA JOCELINE",
    "MACEDONIO TOME JOVANA",
    "BAENA ECHAVARRI JONATHAN",
    "ZAVALA VAZQUEZ MIXUNARI",
    "RIVERO MORENO JULIO ADRIAN",
    "RAMIREZ MARTINEZ DIANA CAROLINA",
    "GONZALEZ GUERRERO SOCORRO BELEM",
    "GABRIEL RIVERA ALEJANDRO",
    "FRIAS FAZ LUIS ARTURO",
    "ALVAREZ GONZALEZ JANET VALERIA",
    "POSADAS MORENO SARAI",
    "VALERO GUERRERO OLGA LIDIA"
  ];
  const HC_PAGO_REEMBOLSO_LIDERES = [
    "LARA GARCIA ERIKA AURORA",
    "AGUILAR HERNANDEZ JUAN CARLOS",
    "SALAZAR LOPEZ LUIS FERNANDO"    
  ];

  const HC_CATALOGOS = {
    "Programación": {
      "Dictaminador": [
        "ARRIAGA DOMINGUEZ ADRIANA CAROLINA",
        "GARCIA IBARRA AMADA ESPERANZA",
        "HERNANDEZ GARCIA MARIA CRISTINA",
        "LOPEZ FLORES SILVIA ARACELI",
        "LOZANO MORALES HERIBERTO ALEXIS",
        "RAMIREZ HERRERA VICTOR ALAN",
        "NAVA SANCHEZ JOSE ROBERTO",
        "RANGEL AGUILAR BELEN SARAI",
        "LOPEZ CALIXTO VICENTE ALEXIS",
        "ORTIZ SILICEO ALBERTO ALEJANDRO",
        "MOLINA VELAZQUEZ CARLOS MAURICIO",
        "SANCHEZ GARCIA ISMAEL AARON",
        "FRANCO GARCIA AMINEY",
        "PEREZ ALVAREZ STEPHANYE"
      ],
      "Gerencia": [],
      "Coordinación": [
        "HERNANDEZ TENORIO FELIPE ERNESTO",
        "TORRES RUIZ CLAUDIA",
        "HAM ORTIZ JESSICA"
      ]
    },

    "Reembolso": {
      "Dictaminador": [
        "MARTINEZ ARRIAGA AXEL EMMANUEL",
        "PEÑA MENDEZ ERICK NOE",
        "SANCHEZ SALGADO YOLANDA",
        "DIAZ TOVAR ROBERTO",
        "ANDRADE PEREZ GUSTAVO MANUEL",
        "CASTILLEJA HERNANDEZ YANIRA NALLELY",
        "SANCHEZ AMEZQUITA MONICA",
        "SANTIAGO CARRILLO REBECA ANDREA",
        "FLORES SALA REGINA",
        "FUENTES VILLALOBOS DULCE PAOLA",
        "GUZMAN MUÑOZ PAMELA"
      ],
      "Gerencia": [
        "OLIVERA ALVAREZ ANHALY"
      ],
      "Coordinación": [
        "SALAZAR LOPEZ LUIS FERNANDO",
        "AGUILAR HERNANDEZ JUAN CARLOS",
        "JIMENEZ GARNICA VERONICA"
      ]
    },

    "Pago directo": {
      "Dictaminador": [
        "RUIZ PALACIOS DAVID",
        "PRADO PELAEZ VIRIDIANA",
        "URBINA TERAN SAID",
        "SANDOVAL PEREZ ANA KAREN",
        "AVILA RESENDIZ CINTHIA BERENICE",
        "RIVERA RAMIREZ GUADALUPE CONCEPCION",
        "BAZALDUA OVIEDO IBAN GAUTIER",
        "ESTRELLA VALADEZ EMERSON JOSE",
        "SAUCEDA CASTRO JUAN ANTONIO",
        "RAMIREZ SILVA LEANDRO EDUARDO",
        "POTENCIANO PADILLA CRISTINA ARLETT",
        "CANSECO VAZQUEZ BRENDA PATRICIA",
        "MARGARITO NICOLAS JUAN MANUEL",
        "HERRERA BARRERA MARIA LUISA",
        "CARRILLO RUIZ BARBARA",
        "ONTIVEROS TORRES ANA CRISTINA"
      ],
      "Gerencia": [
        "BAZALDUA OVIEDO IBAN GAUTIER"
      ],
      "Coordinación": [
        "SALAS GRANADOS ALEJANDRA GUADALUPE",
        "AVILA RESENDIZ CINTHIA BERENICE",
        "RAZO RUVALCABA JUAN MANUEL"
      ]
    },

    "Pagos": {
      "Dictaminador": [
        "ONTIVEROS CORDOVA JOSE ARMANDO",
        "FERNANDEZ CONTRERAS ERNESTO",
        "ALVAREZ MARTINEZ IVAN",
        "MARIN FABIAN JORGE OMAR",
        "MARTINEZ REYES MAGALY",
        "LOPEZ GARZON MARIA DEL PILAR",
        "PEREZ SORIANO ISSAC",
        "SANCHEZ FLORES ANA ELENA",
        "ABAD SUAREZ ERIC BENTURA",
        "BLANCARTE PEREZ BEATRIZ ADRIANA",
        "REUS PRADO XOCHITL DEL CARMEN",
        "IBARRA MUÑOZ JUAN CARLOS",
        "TLAXCALTECO RUIZ TERESA ARACELI",
        "CUELLAR RIOS ELIZABETH",
        "AGUILAR TELLEZ BENJAMIN RODRIGO",
        "MUÑOZ HUITZIL KAREN GIOVANNA",
        "GONZALEZ MUNGUIA DENISSE ALEJANDRA",
        "NUÑO NAJAR MARTHA MARCELA",
        "ESPINDOLA SALAS URIEL RODRIGO",
        "PEREZ AGUILAR MARIA GUADALUPE",
        "SERRANO CANO ALICIA",
        "LOZANO REYES PABLO DE JESUS",
        "CORTES SALAS SAUL",
        "SUAREZ JIMENEZ JOSE EDUARDO",
        "MORALES ESQUIVEL JUAN ULISES",
        "VAZQUEZ ARELLANO DIANA CECILIA",
        "DE LA O QUIROZ JOSE ANTONIO",
        "FLORES PALAFOX PAMELA JOCELINE",
        "MACEDONIO TOME JOVANA",
        "BAENA ECHAVARRI JONATHAN",
        "ZAVALA VAZQUEZ MIXUNARI",
        "RIVERO MORENO JULIO ADRIAN",
        "RAMIREZ MARTINEZ DIANA CAROLINA",
        "GONZALEZ GUERRERO SOCORRO BELEM",
        "GABRIEL RIVERA ALEJANDRO",
        "FRIAS FAZ LUIS ARTURO",
        "ALVAREZ GONZALEZ JANET VALERIA",
        "POSADAS MORENO SARAI",
        "VALERO GUERRERO OLGA LIDIA",
        "HERNANDEZ BLANCO JESUS ALEJANDRO"
      ],
      "Gerencia": [
        "ANGELES MEDINA RAMON"
      ],
      "Coordinación": [
        "LARA GARCIA ERIKA AURORA",
        "AGUILAR HERNANDEZ JUAN CARLOS"
      ]
    },
  "ATF": {
      "Dictaminador": [],
      "Gerencia": [],
      "Coordinación": ["JIMENEZ GARNICA VERONICA"]
    },

    "Case Managment": {
      "Dictaminador": [
        "SANCHEZ GARCIA ISMAEL AARON",
        "MOLINA VELAZQUEZ CARLOS MAURICIO",
        "PEREZ ALVAREZ STEPHANYE"
      ],
      "Gerencia": ["HERNANDEZ TENORIO FELIPE ERNESTO"],
      "Coordinación": [
        "RIVERA TERRES PAOLA",
        "TORRES RUIZ CLAUDIA"
      ]
    },

    "Redes": {
      "Dictaminador": [
        "RAZO RUVALCABA JUAN MANUEL"
      ],
      "Gerencia": [
        "ALTAMIRANO RAMOS ILSE"
      ],
      "Coordinación": [
        "REYES GARCIA GRISEL",
        "PARRA MARTINEZ FABIOLA",
        "GARCIA OCARIZ TANIA"
      ]
    },
    "Siniestralidad": {
      "Analista Pago Reembolso": HC_PAGO_REEMBOLSO_ANALISTAS,
      "Líder Pago Reembolso": HC_PAGO_REEMBOLSO_LIDERES
    },
  };

  let fechaInicio = new Date().toISOString();
  let ultimoTramite = "";
  let ultimoTramiteSeguimiento = "";
  let ultimaClaveHC = "";
  let ultimoTipoGestionHC = "";
  let ultimoTipoGestionContratante = "";
  let ultimoTramiteDictaminador = "";
  let hcSiniestralidadCargado = false;

  /* ================================================================
    2. ARRANQUE
    ================================================================ */

  const selGestor = $("gestor");

  GESTORES.forEach(g => {
    const o = document.createElement("option");
    o.value = g.correo;
    o.textContent = g.nombre;
    o.dataset.nombre = g.nombre;
    selGestor.appendChild(o);
  });

  /* ================================================================
    3. FUNCIONES BASE
    ================================================================ */

  /* Lee los archivos del input de adjuntos y los devuelve como arreglo base64
     [{ NombreArchivo, TipoContenido, ContenidoBase64 }] para que el flujo los suba a la biblioteca. */

  function inicializarCatalogosFijos(){
    llenarSelect("Solicitud_Relacionada", SOLICITUD_RELACIONADA_OPCIONES, "Selecciona la solicitud…");
    llenarSelect("Quien_Activa", QUIEN_ACTIVA_OPCIONES, "Selecciona quién activa…");
    llenarSelect("Tipo_Gestion", CLIENTES, "Selecciona el cliente…");
    restaurarClienteRecordado();
    llenarSelect("Prioridad_Atencion", PRIORIDAD_ATENCION_OPCIONES, "Selecciona la prioridad…");
    llenarSelect("Estatus_Interno", ESTATUS_INTERNO_OPCIONES, "Selecciona…");
    $("Estatus_Interno").value = "Abierto";   // default
    llenarSelect("Implicacion", IMPLICACION_OPCIONES, "Selecciona…");
    llenarSelect("Tipo_Activacion_Interna", TIPO_ACTIVACION_INTERNA_OPCIONES, "Selecciona…");
    cargarTipoTramite();
    cargarTipoAtencion();
  }

  /* Multicliente: catálogos de trámite y atención según cliente explícito */
  function cargarTipoTramite(){
    const cliente = valor("Tipo_Gestion");
    const catalogo = TRAMITES_POR_CLIENTE[cliente] || [];
    const actual = valor("Tipo_Tramite");
    llenarSelect("Tipo_Tramite", catalogo, cliente ? "Selecciona…" : "Selecciona primero el cliente…");
    if(catalogo.includes(actual)) $("Tipo_Tramite").value = actual;  // conserva selección si sigue siendo válida
  }

  function cargarTipoAtencion(){
    const cliente = valor("Tipo_Gestion");
    const catalogo = ATENCIONES_POR_CLIENTE[cliente] || [];
    const actual = valor("Tipo_Atencion");
    llenarSelect("Tipo_Atencion", catalogo, cliente ? "Selecciona…" : "Selecciona primero el cliente…");
    if(catalogo.includes(actual)) $("Tipo_Atencion").value = actual;
  }

  /* Recordar la última selección válida de cliente (solo el valor del catálogo, sin PII) */
  function restaurarClienteRecordado(){
    try{
      const guardado = localStorage.getItem(CLIENTE_STORAGE_KEY);
      if(guardado && CLIENTES.includes(guardado)) $("Tipo_Gestion").value = guardado;
    }catch(e){ /* almacenamiento no disponible: sin persistencia */ }
  }

  function recordarCliente(){
    try{
      const c = valor("Tipo_Gestion");
      if(CLIENTES.includes(c)) localStorage.setItem(CLIENTE_STORAGE_KEY, c);
    }catch(e){}
  }

  /* ================================================================
    4. ESCENARIO
    ================================================================ */

  function cargarOpcionesEscenario(tramite){
    if(tramite === ultimoTramite) return;

    ultimoTramite = tramite;

    if(tramite === "Programación" || tramite === "Reembolso"){
      llenarSelect("Escenario", ESCENARIOS_PROGRAMACION_REEMBOLSO, "Selecciona el escenario…");
    }else if(tramite === "Pago directo"){
      llenarSelect("Escenario", ESCENARIOS_PAGO_DIRECTO, "Selecciona el escenario de pago directo…");
    }else{
      llenarSelect("Escenario", [], "Selecciona…");
    }

    llenarSelect("Subescenario", SUBESCENARIOS_SERVICIOS_APOYO, "Selecciona el subescenario…");
  }

  function construirNombreEscenario(){
    const tramite = valor("Tipo_Tramite");
    const escenario = valor("Escenario");
    const subescenario = valor("Subescenario");

    if(!escenario) return "";

    if((tramite === "Programación" || tramite === "Reembolso") && escenario === "Servicios de apoyo"){
      return subescenario ? "Servicios de apoyo - " + subescenario : "";
    }

    if(tramite === "Pago directo"){
      return "Pago directo - " + escenario;
    }

    return escenario;
  }

  /* ================================================================
    5. SEGUIMIENTO Y HC
    ================================================================ */

  function cargarOpcionesSeguimiento(tramite){
    if(tramite === ultimoTramiteSeguimiento) return;

    ultimoTramiteSeguimiento = tramite;

    const base = SEGUIMIENTO_POR_TRAMITE[tramite] || [];
    const opciones = [...base, "Ninguno"];   // "Ninguno": el caso se resolvió sin tocar base con nadie

    llenarSelect(
      "Seguimiento_Con",
      opciones,
      "Selecciona seguimiento…"
    );

    llenarSelect("HC", [], "Selecciona HC…");
    ultimaClaveHC = "";
  }

  /* Sura / General de Salud: el HC se maneja general por campaña (no por trámite/seguimiento) */
  function esGestionSGS(){
    const tg = valor("Tipo_Gestion");
    return tg === "General de Salud" || tg === "Sura";
  }

  function cargarHCSGS(){
    const tg = valor("Tipo_Gestion");
    if(tg === ultimoTipoGestionHC) return;   // solo recarga al cambiar de campaña
    ultimoTipoGestionHC = tg;
    const lista = HC_SGS_ACTIVOS[tg] || [];
    llenarSelect(
      "HC",
      lista,
      lista.length ? "Selecciona HC…" : "Sin HC configurado…"
    );
  }

  function cargarOpcionesHC(){
    if(esGestionSGS()){          // HC general por campaña, sin filtrar por trámite/seguimiento
      cargarHCSGS();
      return;
    }

    const tramite = valor("Tipo_Tramite");
    const seguimiento = valor("Seguimiento_Con");
    const clave = tramite + "|" + seguimiento;

    if(clave === ultimaClaveHC) return;

    ultimaClaveHC = clave;

    const opciones = HC_CATALOGOS[tramite]?.[seguimiento] || [];

    llenarSelect(
      "HC",
      opciones,
      opciones.length ? "Selecciona HC…" : "Sin HC configurado…"
    );
  }

  function cargarDictaminadoresPorTramite(){
    /* Sura/GS: en vez de dictaminador se lista el COLABORADOR de la campaña (HC general) */
    if(esGestionSGS()){
      const tg = valor("Tipo_Gestion");
      const clave = "SGS|" + tg;
      if(clave === ultimoTramiteDictaminador) return;
      ultimoTramiteDictaminador = clave;
      const lista = HC_SGS_ACTIVOS[tg] || [];
      llenarSelect(
        "Nombre_Dictaminador",
        lista,
        lista.length ? "Selecciona colaborador…" : "Sin colaboradores configurados…"
      );
      return;
    }

    const tramite = valor("Tipo_Tramite");

    if(tramite === ultimoTramiteDictaminador) return;
    ultimoTramiteDictaminador = tramite;

    /* HF-03 rectificado: ATF no tiene dictaminadores propios; el desplegable
       usa la unión de Programación + Reembolso + Pago directo (orden fijo).
       Dedup por igualdad de texto: no hay identificador estable en el
       catálogo fuente, por lo que variantes de mayúsculas/espacios en los
       datos originales no se detectarían como duplicado. No se mutan los
       arreglos fuente. */
    let opciones;
    if(tramite === "ATF"){
      const union = [
        ...(HC_CATALOGOS["Programación"]?.["Dictaminador"] || []),
        ...(HC_CATALOGOS["Reembolso"]?.["Dictaminador"] || []),
        ...(HC_CATALOGOS["Pago directo"]?.["Dictaminador"] || [])
      ];
      opciones = [...new Set(union)];
    } else {
      opciones = HC_CATALOGOS[tramite]?.["Dictaminador"] || [];
    }

    llenarSelect(
      "Nombre_Dictaminador",
      opciones,
      opciones.length ? "Selecciona dictaminador…" : "Sin dictaminadores configurados…"
    );
  }

  function hayOpcionesHC(){
    const tramite = valor("Tipo_Tramite");
    const seguimiento = valor("Seguimiento_Con");
    const opciones = HC_CATALOGOS[tramite]?.[seguimiento] || [];
    return opciones.length > 0;
  }

  function cargarHCSiniestralidad(){
    if(hcSiniestralidadCargado) return;
    hcSiniestralidadCargado = true;
    llenarSelect("HC_Siniestralidad", HC_PAGO_REEMBOLSO_ANALISTAS, "Selecciona analista de Pago Reembolso…");
  }

  /* ================================================================
    6. SWITCHES (impacto económico + error del analista)
    ================================================================ */

  /* ================================================================
    7. VISIBILIDAD
    ================================================================ */

  /* ================================================================
    8. LISTENERS
    ================================================================ */

  [
    "Tipo_Atencion",
    "Tipo_Tramite",
    "Contratante",
    "Escenario",
    "Subescenario",
    "Seguimiento_Con",
    "gestor",
    "Cuenta_Con_Folio",
    "Implicacion",
    "Solicitud_Relacionada",
    "Quien_Activa",
    "Tipo_Activacion_Interna",
    "Se_Realizo_Accion_Correctiva",
    "Resultado_Queja",
    "Cuenta_Con_Pruebas",
    "Cuenta_Con_Respuesta_Area_Interna",
    "Contratante"
  ].forEach(id=>{
    $(id).addEventListener("change", actualizarVisibilidad);
  });

  /* Cliente: listener único y centralizado — recuerda la selección y limpia
     los valores incompatibles del cliente anterior antes de recalcular. */
  $("Tipo_Gestion").addEventListener("change", () => {
    recordarCliente();
    $("Tipo_Tramite").value = "";
    $("Tipo_Tramite_Otro").value = "";
    $("Tipo_Atencion").value = "";
    $("Tipo_Atencion_Otro").value = "";
    $("Cuenta_Con_Folio").value = "";
    actualizarVisibilidad();
  });

  /* ================================================================
    8b. HANDLERS DE CLIC (Etapa 3 — reemplaza los 11 onclick inline
    retirados del HTML; mismo elemento, misma función, mismos
    argumentos literales, mismo efecto)
    ================================================================ */

  document.querySelector('.nav-item[data-view="registro"]').addEventListener("click", () => cambiarVista('registro'));
  document.querySelector('.nav-item[data-view="reportes"]').addEventListener("click", () => cambiarVista('reportes'));
  document.querySelector('.nav-item[data-view="powerbi"]').addEventListener("click", () => cambiarVista('powerbi'));

  document.querySelector('[data-error-toggle] .impact-option[data-impact-value="Sí"]').addEventListener("click", () => seleccionarErrorAnalista('Sí'));
  document.querySelector('[data-error-toggle] .impact-option[data-impact-value="No"]').addEventListener("click", () => seleccionarErrorAnalista('No'));

  document.querySelector('[data-impact-toggle] .impact-option[data-impact-value="Sí"]').addEventListener("click", () => seleccionarImpactoEconomico('Sí'));
  document.querySelector('[data-impact-toggle] .impact-option[data-impact-value="No"]').addEventListener("click", () => seleccionarImpactoEconomico('No'));

  document.querySelector('.back-link').addEventListener("click", () => cambiarVista('registro'));

  document.querySelector('#btnGenerarReporte').addEventListener("click", () => generarReporteFiltrado());

  document.querySelector('.powerbi-action-card:not(#btnRefreshPowerBI)').addEventListener("click", () => abrirDashboardPowerBI());
  document.querySelector('#btnRefreshPowerBI').addEventListener("click", () => solicitarRefreshPowerBI());

  /* ================================================================
    9. VALIDACIÓN
    ================================================================ */

  /* ================================================================
    10. ENVÍO
    ================================================================ */

  /* ================================================================
    11. UTILIDADES
    ================================================================ */

  $("submitBtn").addEventListener("click", enviar);
  $("resetBtn").addEventListener("click", limpiar);

  /* Contador de caracteres del análisis de la queja */
  function actualizarContadorAnalisis(){
    const ta = $("Analisis_Queja");
    const counter = $("Analisis_Queja_counter");
    if(!ta || !counter) return;
    const max = parseInt(ta.getAttribute("maxlength"), 10) || 2000;
    const n = ta.value.length;
    const b = counter.querySelector("b");
    if(b) b.textContent = n;
    counter.classList.toggle("near", n >= max * 0.9);
  }
  $("Analisis_Queja").addEventListener("input", actualizarContadorAnalisis);

  /* ================================================================
    12. PROGRESO + VALIDACIÓN INLINE (capa visual)
    ================================================================ */

  function actualizarProgreso(){
    const reqs = [];
    document.querySelectorAll("[data-required]").forEach(el=>reqs.push(el));
    document.querySelectorAll("[data-cond-required]").forEach(el=>{
      const bloque = el.getAttribute("data-cond-required");
      const visible = document.querySelector('[data-block="'+bloque+'"]:not(.hidden)');
      const cont = el.closest(".field");
      const campoVisible = cont ? cont.offsetParent !== null : el.offsetParent !== null;
      if(visible && campoVisible) reqs.push(el);
    });
    const total = reqs.length;
    const llenos = reqs.filter(el => el.value.trim() !== "").length;
    const pct = total ? Math.round(llenos / total * 100) : 0;

    const fill = $("wpFill"), label = $("wpLabel"), count = $("wpCount"), bar = $("weeProgress");
    if(fill) fill.style.width = pct + "%";
    if(label) label.textContent = pct + "%";
    if(count) count.textContent = llenos + " de " + total + " campos";
    if(bar){
      bar.classList.toggle("complete", total > 0 && llenos === total);
      bar.setAttribute("aria-valuenow", pct);
    }
  }

  /* Al escribir: recalcula progreso y limpia el error del campo corregido */
  document.addEventListener("input", e=>{
    const t = e.target;
    if(t && t.classList && t.classList.contains("invalid")){
      t.classList.remove("invalid");
      const f = t.closest(".field");
      const err = f && f.querySelector(".field-error");
      if(err) err.classList.remove("show");
    }
    actualizarProgreso();
  });
  document.addEventListener("change", actualizarProgreso);

  /* ================================================================
    13. REPORTES Y DESCARGAS (CSV desde flujo de lectura)
    ================================================================ */

  // Pega aquí la URL del flujo de LECTURA de Power Automate (ver power_automate_cambios.md).
  // Debe devolver un arreglo JSON con los registros de SharePoint.
  const REPORT_URL = "https://defaultabb9b2bf39d446218be853022aab1a.b4.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/2f08f42b57bc43e280eb23b2bb89e7e0/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=WDWQuMy-uQbqjL7VLEdD-imkxOwIV6l1FQUNcW-03Ak";

  // Etiquetas legibles para los encabezados del CSV.
  const ETIQUETAS_REPORTE = {
    Folio:"Folio", Fecha_Recepcion_ATC:"Fecha recepción ATC",
    Tipo_Tramite:"Tipo de trámite", Tipo_Atencion:"Tipo de atención",
    Escenario:"Escenario", Subescenario:"Subescenario", Nombre_Escenario:"Nombre del escenario",
    Imputable_Gral:"Imputable a", Resultado_Queja:"Resultado", Analisis_Queja:"Análisis de la queja",
    Tiene_Impacto_Economico:"¿Tiene impacto económico?", Impacto_Economico:"Impacto económico ($)",
    Solicitud_Relacionada:"Solicitud relacionada", Seguimiento_Con:"Seguimiento con",
    HC:"HC / persona de seguimiento", Quien_Activa:"¿Quién activa?",
    Contratante:"Contratante", Catalogo:"Catálogo", Tipo_Condicion:"Tipo de condición",
    Nombre_Dictaminador:"Médico / dictaminador", Es_Error_Analista:"¿Error del analista?",
    Nombre_Gestor:"Gestor", Correo_Gestor:"Correo del gestor",
    Fecha_Respuesta_Final:"Fecha respuesta final", Fecha_Inicio:"Inicio captura", Fecha_Fin:"Fin captura"
  };

  // Reporte 1: detalle completo de trámites.
  const COLUMNAS_DETALLE = [
    "Folio","Fecha_Recepcion_ATC","Tipo_Tramite","Tipo_Atencion",
    "Escenario","Subescenario","Nombre_Escenario",
    "Imputable_Gral","Resultado_Queja","Analisis_Queja",
    "Tiene_Impacto_Economico","Impacto_Economico",
    "Solicitud_Relacionada","Seguimiento_Con","HC","Quien_Activa",
    "Contratante","Catalogo","Tipo_Condicion",
    "Nombre_Dictaminador","Es_Error_Analista",
    "Nombre_Gestor","Correo_Gestor",
    "Fecha_Respuesta_Final","Fecha_Inicio","Fecha_Fin"
  ];

  // Reporte 2: calidad y seguimiento (personas / médicos / responsables).
  const COLUMNAS_CALIDAD = [
    "Folio","Fecha_Recepcion_ATC","Tipo_Tramite","Tipo_Atencion",
    "Nombre_Gestor","Correo_Gestor",
    "Nombre_Dictaminador","Es_Error_Analista",
    "Imputable_Gral","Resultado_Queja",
    "Seguimiento_Con","HC","Quien_Activa",
    "Tiene_Impacto_Economico","Impacto_Economico",
    "Fecha_Respuesta_Final"
  ];

  /* ----- Reporte filtrado (nuevo panel de filtros) ----- */

  /* Cambio de vista (sidebar): registro ↔ reportes */
  function cambiarVista(nombre){
    document.querySelectorAll("[data-view-panel]").forEach(v=>{
      v.classList.toggle("hidden", v.getAttribute("data-view-panel") !== nombre);
    });
    document.querySelectorAll(".nav-item").forEach(n=>{
      n.classList.toggle("active", n.getAttribute("data-view") === nombre);
    });
    actualizarBreadcrumb(nombre);
    window.scrollTo({ top:0, behavior:"smooth" });
  }

  /* ================================================================
    14. POWER BI
    ================================================================ */

  const POWERBI_PUBLIC_URL = "https://app.powerbi.com/view?r=eyJrIjoiNjUyMTk5OGEtZTIyYi00N2ZjLThmN2EtNzM2YmM0YTllZWE4IiwidCI6ImFiYjliMmJmLTM5ZDQtNDYyMS04YmU4LTUzMDIyYWFiMWFiNCIsImMiOjR9";
  const POWERBI_REFRESH_URL = "https://defaultabb9b2bf39d446218be853022aab1a.b4.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/5e1f92e995b94a089d72da1bd7cf7201/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=IUCoI0EImJX_Wmajm0lmzz7ub5QlpmOTFxk6V1JzSk4";

  function abrirDashboardPowerBI(){
    if(!POWERBI_PUBLIC_URL || POWERBI_PUBLIC_URL.includes("PEGA_AQUI")){
      mostrarToast("err","Falta configurar la URL pública de Power BI.");
      return;
    }
    window.open(POWERBI_PUBLIC_URL, "_blank", "noopener,noreferrer");
  }

  async function solicitarRefreshPowerBI(){
    if(!POWERBI_REFRESH_URL){
      mostrarToast("err","Falta configurar la URL del flujo de actualización de Power BI.");
      return;
    }

    const btn = $("btnRefreshPowerBI");
    if(btn) btn.classList.add("loading");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try{
      const res = await fetch(POWERBI_REFRESH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "crm-quejas-banorte" }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if(!res.ok) throw new Error("HTTP " + res.status);

      mostrarToast("ok","Actualización solicitada. Power BI puede tardar unos minutos en reflejar los cambios.");
    }catch(err){
      clearTimeout(timeoutId);
      console.error("Error al solicitar refresh de Power BI:", err);
      mostrarToast("err","No se pudo solicitar la actualización de Power BI.");
    }finally{
      if(btn) btn.classList.remove("loading");
    }
  }

  function inicializarPowerBI(){
    const frame = $("powerbiFrame");
    if(!frame) return;
    if(!POWERBI_PUBLIC_URL || POWERBI_PUBLIC_URL.includes("PEGA_AQUI")) return;
    frame.src = POWERBI_PUBLIC_URL;
  }

  /* ================================================================
    15. CAPA VISUAL UX v3 — breadcrumb + resumen de la atención
    Solo lectura de campos existentes: no toca payload, validaciones
    ni lógica de negocio.
    ================================================================ */

  const BREADCRUMB_VISTAS = {
    registro: "Registro de atención",
    reportes: "Reportes",
    powerbi:  "Power BI"
  };

  function actualizarBreadcrumb(nombre){
    const b = $("breadcrumbActual");
    if(b) b.textContent = BREADCRUMB_VISTAS[nombre] || nombre;
  }

  function actualizarResumenAtencion(){
    const set = (id, v) => {
      const el = $(id);
      if(el) el.textContent = (v && String(v).trim()) ? v : "--";
    };
    set("sum_campania", valor("Tipo_Gestion"));   /* multicliente: sin default Banorte */
    set("sum_prioridad", valor("Prioridad_Atencion"));
    set("sum_estatus", valor("Estatus_Interno"));
    const g = selGestor.options[selGestor.selectedIndex];
    set("sum_gestor", (g && g.value) ? g.dataset.nombre : "");
    const f = valor("Fecha_Recepcion_ATC");
    set("sum_fecha", f ? f.replace("T", " · ") : "");
    set("sum_pruebas", valor("Cuenta_Con_Pruebas"));
    const af = $("Adjuntos_Files");
    const elAdj = $("sum_adjuntos");
    if(elAdj) elAdj.textContent = String(af && af.files ? af.files.length : 0);
  }

  document.addEventListener("input", actualizarResumenAtencion);
  document.addEventListener("change", actualizarResumenAtencion);
  $("resetBtn").addEventListener("click", () => setTimeout(actualizarResumenAtencion, 0));

  inicializarCatalogosFijos();
  actualizarVisibilidad();
  actualizarContadorAnalisis();
  actualizarProgreso();
  inicializarPowerBI();
  actualizarResumenAtencion();
