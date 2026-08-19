# Family Wallet — Dubai 👛

App web para llevar los ingresos y gastos del mes, pensada para usarla entre dos
personas desde el móvil. Reproduce la lógica del Excel *2026 Budget Template* y
ya viene con todos los datos que había en él (445 movimientos de enero a julio de 2026).

## Qué hace

| Pestaña | Equivalente en el Excel |
|---|---|
| **Mes** | Las hojas `Enero`…`Diciembre`: ingresos del mes, alta de gastos, registro por semanas y resumen por categoría |
| **Anual** | El bloque *RESUMEN ANUAL* de la hoja `Resumen`, más gráficos por mes y por categoría |
| **Presupuesto** | Las secciones *INGRESOS*, *PREVISIÓN GASTOS FIJOS* y *DISTRIBUCIÓN DEL INGRESO* |
| **Ahorros** | La hoja `Ahorros` (cuentas, fondos de emergencia y provisiones) |
| **Ajustes** | Tipo de cambio, año, categorías, sincronización y copias de seguridad |

Detalles que se conservan del Excel:

- **Dos monedas.** Cada movimiento guarda su importe en la moneda en la que se pagó
  (AED o EUR) y el botón de la cabecera cambia la moneda en la que se ven todos los
  totales, usando el tipo de cambio de Ajustes (por defecto 1 AED = 0,24 €).
- **Semanas 1-5.** Se calcula sola a partir de la fecha (días 1-7 → semana 1, 8-14 → semana 2…).
- **Presupuesto disponible** = ingresos − gastos fijos − ahorro, igual que la celda `B32`.
- **Ingresos por mes.** Los importes base valen para todo el año, pero se puede ajustar
  un mes concreto (como estaban hechos junio y julio) sin tocar el resto.

> Un aviso sobre los datos importados: en el Excel las fórmulas de *RESUMEN POR CATEGORÍA*
> solo sumaban las filas 37 a 56, pero en abril, mayo, junio y julio hay gastos por debajo
> de esa fila. Por eso el total del mes que muestra la app es mayor que el del Excel
> (junio: 39.188 AED en vez de 25.618 AED). El bueno es el de la app: suma todos los movimientos.

## Uso en local

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # comprueba la función del servidor y la fusión de cambios
```

Sin configurar nada, los datos se guardan en el propio navegador (`localStorage`),
así que la app funciona aunque no haya servidor.

## Despliegue en Netlify

1. En Netlify: **Add new site → Import an existing project** y elegir este repositorio.
   La configuración ya está en `netlify.toml` (build `npm run build`, publish `dist`,
   funciones en `netlify/functions`), no hay que tocar nada.
2. En **Site configuration → Environment variables**, crear:

   | Variable | Valor |
   |---|---|
   | `WALLET_KEY` | una contraseña compartida, la que queráis |

3. Volver a desplegar para que la función recoja la variable.
4. Abrir la web, ir a **Ajustes → Sincronización**, escribir esa misma contraseña y
   guardar. Hacer lo mismo en el otro móvil.

A partir de ahí los dos veis los mismos datos: se guardan en
[Netlify Blobs](https://docs.netlify.com/blobs/overview/), que viene incluido en el
plan gratuito y no necesita ninguna base de datos aparte.

**Consejo:** desde el móvil, «Añadir a pantalla de inicio» para tenerla como una app más.

### Cómo se sincroniza

- Los cambios se suben al servidor un segundo después de hacerlos, y cada 45 segundos
  se comprueba si el otro ha guardado algo.
- Si los dos editáis a la vez, no se pisa nada: cada línea tiene su marca de tiempo y se
  queda la más reciente; lo borrado se marca como borrado para que no reaparezca.
- Sin conexión la app sigue funcionando y sube los cambios cuando vuelve.

## Copias de seguridad

En **Ajustes → Copias de seguridad**:

- *Exportar copia (JSON)* — copia completa, sirve para restaurar con *Importar copia*.
- *Exportar gastos (CSV)* — una fila por gasto, se abre directamente en Excel.

## Conectar el banco más adelante

No está hecho, y conviene saber lo que implica antes de meterse: los bancos de
Emiratos no suelen dar una API abierta, así que haría falta un agregador
(Lean Technologies, Tarabut o similar) con contrato y una clave de API, y un
proceso de servidor que lea los movimientos y los meta aquí. La app ya está
preparada por dentro para eso —los movimientos se guardan como una lista plana
con id, fecha, importe, moneda y categoría—, así que sería añadir una función
más que escriba en el mismo sitio. Mientras tanto, el camino corto es exportar
el CSV del banco e importarlo; si te interesa, lo montamos.

## Estructura

```
src/
  lib/calc.js      cálculos y conversión de moneda
  lib/store.js     estado, guardado local y sincronización
  lib/merge.js     fusión de los cambios de los dos dispositivos
  lib/seed.js      datos importados del Excel
  components/      una pantalla por pestaña
netlify/functions/
  data.mjs         GET/PUT del estado, protegido por WALLET_KEY
```
