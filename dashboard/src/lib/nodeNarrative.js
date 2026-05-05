// Traduce el estado de un nodo a lenguaje plano para el agrónomo.
// Toma {nodo, ultima_lectura, score, online} y devuelve {severity, headline, why, technical}.
// Severity: 'red' = atender hoy, 'amber' = atender en días, 'green' = sin pendientes.

const UMBRAL_RIEGO_HOY = 22       // h10 % — debajo es urgente regar
const UMBRAL_RIEGO_PRONTO = 28    // h10 % — debajo conviene programar riego
const UMBRAL_BATERIA = 3.3        // V
const UMBRAL_BATERIA_CRITICA = 3.1
const UMBRAL_EC_ALTO = 2.0        // dS/m — sales subiendo
const UMBRAL_SCORE_ALTO = 76
const UMBRAL_SCORE_MEDIO = 51
const UMBRAL_OFFLINE_AMBAR_MIN = 30
const UMBRAL_OFFLINE_ROJO_MIN = 12 * 60   // 12h

function fmt(n, d = 1) {
  if (n == null || Number.isNaN(n)) return '—'
  return Number(n).toFixed(d)
}

function horasDesde(iso) {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  return ms / 3600_000
}

function describirOffset(iso) {
  const h = horasDesde(iso)
  if (h == null) return 'sin lecturas'
  if (h < 1) return `hace ${Math.round(h * 60)} min`
  if (h < 24) return `hace ${Math.round(h)}h`
  return `hace ${Math.round(h / 24)}d`
}

export function narrate(nodo) {
  const { nombre, online, score_phytophthora: score, ultima_lectura: u } = nodo
  const h10 = u?.h10_avg
  const t20 = u?.t20
  const ec = u?.ec30
  const bat = u?.bateria
  const tiempo = u?.tiempo

  // 1. Sin datos jamás
  if (!u) {
    return {
      severity: 'amber',
      headline: `${nombre} — sin lecturas todavía`,
      why: 'El sensor está dado de alta pero no ha mandado datos. Verifica que esté encendido y con cobertura.',
      technical: 'sin lecturas',
    }
  }

  // 2. Offline (gana sobre todo lo demás — si no reporta, no podemos confiar en el resto)
  const minutosOffline = !online && tiempo
    ? (Date.now() - new Date(tiempo).getTime()) / 60_000
    : 0

  if (!online && minutosOffline > UMBRAL_OFFLINE_ROJO_MIN) {
    return {
      severity: 'red',
      headline: `${nombre} — sin señal ${describirOffset(tiempo)}`,
      why: 'Lleva más de 12 horas sin reportar. Suele ser pila baja, antena suelta o agua en el chasis. Conviene ir a checar.',
      technical: `última lectura ${describirOffset(tiempo)}`,
    }
  }
  if (!online && minutosOffline > UMBRAL_OFFLINE_AMBAR_MIN) {
    return {
      severity: 'amber',
      headline: `${nombre} — sin reportar ${describirOffset(tiempo)}`,
      why: 'El sensor lleva un rato callado. Si no vuelve en las próximas horas, vale la pena revisarlo.',
      technical: `última lectura ${describirOffset(tiempo)}`,
    }
  }

  // 3. Riesgo Phytophthora alto — la decisión más cara
  if (score >= UMBRAL_SCORE_ALTO) {
    return {
      severity: 'red',
      headline: `${nombre} — riesgo alto de pudrición, aplicar fungicida en 1-2 días`,
      why: 'El suelo lleva días con humedad alta y la temperatura del subsuelo bajó. Son las condiciones donde aparece la pudrición de raíz.',
      technical: `score ${score}/100 · h10 ${fmt(h10)}% · t20 ${fmt(t20)}°C`,
    }
  }

  // 4. Riego urgente
  if (h10 != null && h10 < UMBRAL_RIEGO_HOY) {
    return {
      severity: 'red',
      headline: `${nombre} — regar hoy, raíces secándose`,
      why: 'La humedad en la zona radicular bajó del punto donde el árbol empieza a estresarse para absorber agua.',
      technical: `h10 ${fmt(h10)}% · meta ≥${UMBRAL_RIEGO_PRONTO}%`,
    }
  }

  // 5. Riesgo Phytophthora moderado
  if (score >= UMBRAL_SCORE_MEDIO) {
    return {
      severity: 'amber',
      headline: `${nombre} — riesgo de pudrición subiendo, monitorear`,
      why: 'Las condiciones empezaron a parecerse a las que favorecen Phytophthora. Aún no es para aplicar fungicida, pero conviene revisar mañana.',
      technical: `score ${score}/100`,
    }
  }

  // 6. Riego pronto (no urgente)
  if (h10 != null && h10 < UMBRAL_RIEGO_PRONTO) {
    return {
      severity: 'amber',
      headline: `${nombre} — programar riego en 1-2 días`,
      why: 'El suelo entró en el rango bajo. Todavía no es urgente, pero conviene anotarlo en la próxima vuelta de riego.',
      technical: `h10 ${fmt(h10)}% · meta ≥${UMBRAL_RIEGO_PRONTO}%`,
    }
  }

  // 7. Batería crítica
  if (bat != null && bat < UMBRAL_BATERIA_CRITICA) {
    return {
      severity: 'red',
      headline: `${nombre} — pila por morir, cambiar hoy`,
      why: 'La pila está abajo del punto donde el sensor empieza a apagarse intermitentemente. Si no la cambias hoy, mañana puede caer offline.',
      technical: `batería ${fmt(bat, 2)}V`,
    }
  }
  if (bat != null && bat < UMBRAL_BATERIA) {
    return {
      severity: 'amber',
      headline: `${nombre} — pila bajando, cambiar próxima visita`,
      why: 'Aún reporta bien, pero está en el último 20%. Conviene llevar pila de repuesto.',
      technical: `batería ${fmt(bat, 2)}V`,
    }
  }

  // 8. Salinidad
  if (ec != null && ec > UMBRAL_EC_ALTO) {
    return {
      severity: 'amber',
      headline: `${nombre} — salinidad subiendo, el árbol batalla para absorber`,
      why: 'La sal disuelta en el agua del suelo está alta. Si sigue subiendo, vale la pena revisar el agua de riego o lavar el suelo con un riego abundante.',
      technical: `EC ${fmt(ec, 2)} dS/m`,
    }
  }

  // 9. Todo bien
  return {
    severity: 'green',
    headline: `${nombre} — todo bien`,
    why: null,
    technical: `h10 ${fmt(h10)}% · score ${score}`,
  }
}

export function severityRank(s) {
  return s === 'red' ? 0 : s === 'amber' ? 1 : 2
}

export function saludo(now = new Date()) {
  const h = now.getHours()
  if (h >= 5 && h < 12) return 'Buenos días'
  if (h >= 12 && h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}
