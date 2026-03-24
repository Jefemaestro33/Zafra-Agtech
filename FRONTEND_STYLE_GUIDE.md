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
- Sidebar colapsable: 220px expandido, 60px colapsado (icon rail con ChevronsLeft/Right toggle)
- Sidebar `fixed inset-y-0 left-0 top-12` con `flex flex-col`, perfil `mt-auto` al fondo
- Header `fixed top-0 left-0 right-0 z-50` de 48px (logo AgTech + campana notificaciones)
- Main con `mt-12` + `ml` dinámico según sidebar (`lg:ml-[220px]` o `lg:ml-[60px]`)
- Contenido: `max-w-[1400px] mx-auto px-4 sm:px-6 py-6`
- Spacing entre secciones: `space-y-6`
- Sección "Administrador" en sidebar con divider visual + label uppercase tracking-widest
- Sub-menú desplegable en Alertas (Todas/Destacadas/Borradas) con ChevronsRight rotado 90deg

### Mobile
- Sidebar se convierte en drawer con overlay `rgba(0,0,0,0.5)`
- Botón hamburger/X en header
- Grids colapsan: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Tablas con `overflow-x-auto` y `min-w-[700px]`

### Alertas interactivas
- `ScoreDesglose`: barras horizontales por factor con color semántico (danger=red, warning=amber, ok=green), badge `+N puntos`
- `ExplicacionLogica`: timeline vertical con dots coloreados (3px rounded-full con boxShadow glow) + explicación paso a paso de cada factor
- `Timeline`: eventos cronológicos del incidente con línea vertical conectora
- `Sparkline`: AreaChart mini de 80px height con gradiente cyan, datos de últimas 48h vía `apiFetch`
- `HighlightModal`: modal centrado para destacar alerta con textarea de razón, overlay rgba(0,0,0,0.6)
- Cards colapsables con ChevronUp/Down, `expanded` state default false, badge "Reporte listo" cuando colapsadas y tienen contenido
- Botones inline: "Explícame esta alerta" (toggle cyan), "Timeline del evento" (toggle violet)
- Star para destacar (amber fill cuando activo), Trash2 para papelera (glow-red hover)

### Consultor IA
- Selector de secciones como botones toggle (no dropdown): `rounded-xl`, accent-green-dim cuando activo
- Chat con bubbles: usuario `flex-row-reverse` con surface-3 bg, IA normal con surface-2 bg
- Bot icon con glow-green background, User icon con surface-4
- Loading state con `Loader2 animate-spin` + texto "Analizando datos..."
- `buildContext()` genera contexto real desde los hooks `useApi` (overview, firma, comparativo, clima)
- Placeholder centrado con icono grande 16x16 + texto guía

### Formularios
- Labels con `flex items-center gap-2`: icono Lucide (14px, color del campo) + texto + asterisco rojo para required
- Inputs: `rounded-xl px-4 py-3`, surface-3 background, border cambia a accent-green on focus (via onFocus/onBlur), accent-red on error
- Validación inline: mensajes `text-[11px]` en accent-red debajo del campo con error
- Botón submit: accent-green-dim con Save icon, Loader2 animate-spin durante saving, `disabled:opacity-50`
- Result banner: glow-green con CheckCircle (éxito) o glow-red con AlertTriangle (error)

### Menú desplegable perfil
- Popup `absolute bottom-full` desde el botón de perfil (sale hacia arriba)
- Overlay invisible `fixed inset-0 z-30` para cerrar al hacer click fuera
- Container: `rounded-2xl py-2 shadow-2xl animate-in` con surface-3 background
- Secciones separadas con labels `text-[9px] uppercase tracking-widest`: Configuración, Preferencias
- Items: icono (15px) + label + descripción (text-[10px] muted), hover con surface-4
- Tema oscuro/claro con Moon/Sun icon toggle
- Cerrar sesión en accent-red con glow-red hover
- En modo colapsado: mismo menú pero con `width: 220` posicionado `left-1`

### Vistas placeholder (ProximamenteView)
- Layout centrado: icono grande (36px) en surface-3 rounded-2xl + título + descripción + badge "Próximamente" (glow-amber)
- Usado para: Agrónomos, Usuarios, Historial, Exportar, Contabilidad, Finanzas, Config alertas, Notificaciones, Integraciones, Respaldos, Documentación

---

## Ejemplo de prompt para Claude Code

```
[Pega el contenido de este archivo aquí]

Ahora, agrega una nueva vista "Microbioma" al dashboard que muestre los resultados de qPCR...
```

---

*Actualizado el 23 de marzo de 2026 — AgTech Dashboard v3.0 (sidebar layout + alertas interactivas + consultor IA + CRUD predios)*
