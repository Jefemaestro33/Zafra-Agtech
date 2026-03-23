# FRONTEND STYLE GUIDE — AgTech Nextipac Dashboard

> Pega esto al inicio de cualquier prompt a Claude Code que involucre cambios en el frontend.
> Esto garantiza que mantenga el sistema de diseño dark premium en todas las sesiones.

---

## Reglas de estilo obligatorias

### Colores
- Usar **CSS custom properties** definidas en `dashboard/src/index.css` (nunca colores Tailwind directos)
- Superficies: `--color-surface-0` (fondo) → `--color-surface-4` (más claro)
- Bordes: `--color-border`, `--color-border-light`
- Texto: `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`
- Acentos: `--color-accent-green`, `--color-accent-amber`, `--color-accent-red`, `--color-accent-cyan`, `--color-accent-blue`, `--color-accent-violet`
- Glows (backgrounds sutiles): `--color-glow-green`, `--color-glow-red`, `--color-glow-amber`, `--color-glow-cyan`
- Dims (backgrounds oscuros de acento): `--color-accent-green-dim`, `--color-accent-amber-dim`, `--color-accent-red-dim`, `--color-accent-cyan-dim`

### Iconos
- Usar **lucide-react**, nunca emojis (excepto 🦠 para Phytophthora y ☀️ para ETo que no tienen equivalente Lucide)
- Tamaños estándar: 12px (inline), 14px (botones), 16px (nav), 18px (cards), 20px (KPI icons)

### Tipografía
- UI general: **Plus Jakarta Sans** (ya configurada como font-family del body)
- Datos numéricos, valores de sensores, tablas: clase `font-mono` (JetBrains Mono)
- Nunca usar Inter, Arial, Roboto ni system fonts

### Cards y contenedores
- Border radius: `rounded-2xl`
- Background: `var(--color-surface-2)`
- Border: `1px solid var(--color-border)`
- Usar inline `style={{}}` para CSS variables, no clases Tailwind de color
- Hover en cards: clase `card-glow` (definida en index.css)

### Animaciones
- Elementos que aparecen al cargar: clase `animate-in`
- Stagger secuencial: `stagger-1` hasta `stagger-6` (delay incremental)
- Alertas críticas: clase `pulse-critical`
- Transiciones en hover: `transition-all duration-200`

### Charts (Recharts)
- Grid: `stroke="rgba(42, 47, 64, 0.6)"`
- Axis labels: `{ fontSize: 11, fill: 'var(--color-text-muted)' }`
- Tooltips: usar componente `CustomTooltip` con fondo `--color-surface-3` y borde `--color-border-light`
- Áreas: usar `<linearGradient>` en `<defs>` para fills con fade vertical
- Colores semánticos: cyan para humedad, amber para temperatura, naranja para EC, verde para tratamiento, gris para testigo
- Legend: `wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted)' }}`

### Tablas
- Header: `background: var(--color-surface-3)`, texto `--color-text-muted`, uppercase, tracking-wider
- Filas: hover con `onMouseEnter/Leave` cambiando a `var(--color-surface-3)`
- Bordes entre filas: `borderBottom: '1px solid var(--color-border)'`
- Valores numéricos con colores semánticos: cyan (humedad), amber (temperatura), verde (batería ok), rojo (batería baja)

### Botones
- Primario (acción): `background: var(--color-accent-green-dim)`, `color: var(--color-accent-green)`, `border: 1px solid rgba(16,185,129,0.3)`
- Secundario: `background: var(--color-surface-3)`, `color: var(--color-text-muted)`, `border: 1px solid var(--color-border)`
- Activo/seleccionado: mismo estilo que primario
- Siempre con `transition-all duration-200`

### Badges (ScoreBadge)
- Usan iconos Shield de Lucide por nivel
- BAJO → verde, MODERADO → amber, ALTO → naranja, CRÍTICO → rojo con pulse
- Background con glow sutil del color correspondiente

### Componentes reutilizables
- `KpiCard`: acepta `icon` (componente Lucide o string emoji), `color`, `trend`, `subtitle`
- `ScoreBadge`: acepta `score`, `nivel`, `size`
- `Loading`: skeleton loaders dark-themed
- `EmptyState`: acepta `icon` (Lucide o string), `title`, `description`
- `ChartCard`: wrapper para gráficas con título + subtítulo (definido en NodoView, reutilizable)
- `CustomTooltip`: tooltip dark para Recharts (definido por vista, mismo patrón)

### Layout
- Sidebar fijo 256px en desktop, drawer en mobile
- Header delgado (48px) con logo + bell + avatar
- Contenido: `max-w-[1400px] mx-auto px-4 sm:px-6 py-6`
- Spacing entre secciones: `space-y-6`

### Mobile
- Sidebar se convierte en drawer con overlay `rgba(0,0,0,0.5)`
- Botón hamburger/X en header
- Grids colapsan: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Tablas con `overflow-x-auto` y `min-w-[700px]`

---

## Ejemplo de prompt para Claude Code

```
[Pega el contenido de este archivo aquí]

Ahora, agrega una nueva vista "Microbioma" al dashboard que muestre los resultados de qPCR...
```

---

*Generado el 22 de marzo de 2026 — AgTech Nextipac Dashboard v2.0 (dark premium redesign)*
