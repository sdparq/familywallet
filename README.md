# Family Wallet — Dubai

Web app para llevar los ingresos y gastos del mes, con la misma lógica que la hoja
de cálculo `docs/2026_Budget_Template.xlsx`: presupuesto mensual, registro semanal
de gastos, resumen por categoría, ahorros y resumen anual.

Todo se guarda en un único sitio compartido, así que Santi y Bea ven siempre los
mismos datos desde cualquier móvil u ordenador.

## Cómo funciona

- **Importes en AED o EUR.** Cada gasto se apunta en la moneda en la que se pagó y
  la app convierte con el tipo de cambio configurable (por defecto `1 AED = 0,24 €`).
  El interruptor de la cabecera cambia la moneda de toda la aplicación.
- **Presupuesto del mes** = ingresos − gastos fijos − ahorro comprometido. Lo que
  queda es el disponible para gastos variables, igual que en la hoja *Resumen*.
- **Registro semanal.** Los gastos se agrupan en semanas 1 a 5. Si se indica fecha,
  la semana se calcula sola (y el gasto se coloca en su mes).
- **Ingresos por mes.** Si un mes cobráis algo distinto, se edita en la pestaña
  *Mes* y queda guardado solo para ese mes; el resto sigue con el importe base.
- **Apuntar rápido.** Tres atajos para no teclear de más: pegar el extracto del
  banco, los botones de gastos habituales y el autocompletado. Ver más abajo.

## Puesta en marcha en Netlify

1. Conecta este repositorio en Netlify. La configuración de build ya está en
   `netlify.toml` (comando `npm run build`, carpeta `dist`, Node 22).
   **Comprueba la rama.** En *Site configuration → Build & deploy → Branches and
   deploy contexts*, la *Production branch* tiene que ser
   `claude/clever-lamport-ocfodj`, que es donde está este código. Si apunta a
   otra rama, Netlify publicará otra versión de la app y los cambios de aquí no
   aparecerán nunca.
2. En **Site configuration → Environment variables**, crea la variable
   `APP_PASSWORD` con la contraseña compartida. Sin ella la app responde con un
   error explicando que falta.
3. Despliega. La primera vez que se abre, la base de datos se rellena con los
   datos del Excel y a partir de ahí manda lo que se edite en la app.

Los datos viven en **Netlify Blobs**, que se activa solo: no hay que crear ninguna
base de datos ni cuenta adicional.

> **El repositorio debería ser privado.** `src/data/seed.json` y
> `docs/2026_Budget_Template.xlsx` contienen los sueldos, el alquiler y todos los
> movimientos. Netlify despliega igual desde un repositorio privado.

## Desarrollo en local

```bash
npm install
npm run dev        # contraseña: dubai (o la de APP_PASSWORD)
```

En local la API se sirve desde el propio Vite y guarda en `.local-wallet.json`
(ignorado por git), así que se puede trastear sin tocar los datos de producción.

```bash
npm run build      # comprueba tipos y compila
npm run typecheck  # solo tipos
```

## Volver a importar el Excel

`src/data/seed.json` se genera a partir de la hoja de cálculo:

```bash
pip install openpyxl
npm run seed -- docs/2026_Budget_Template.xlsx src/data/seed.json
```

Solo sirve para el arranque inicial: una vez desplegada la app, los datos guardados
en Netlify Blobs tienen preferencia y el seed ya no se vuelve a leer.

## Estructura

```
netlify/functions/data.mts   API: leer y guardar (Netlify Blobs + contraseña)
src/lib/parse.ts             Lee movimientos del texto pegado del banco
src/lib/suggest.ts           Gastos habituales y categorías sugeridas
src/lib/apply.ts             Operaciones sobre los datos, compartidas cliente/servidor
src/lib/money.ts             Conversión AED/EUR, presupuesto y totales por categoría
src/lib/store.tsx            Estado de la app y sincronización con el servidor
src/components/              Pantallas: Mes, Año, Ahorros y Ajustes
scripts/extract_seed.py      Importador del Excel
```

## Apuntar rápido

Tres formas de no ir gasto a gasto, todas gratis y sin salir del navegador.

### 1. Pegar los movimientos del banco

Botón *Pegar del banco* en la pestaña *Mes*. Copias la lista de movimientos de la
web o la app del banco, la pegas y se leen todos de golpe. Entiende:

- CSV o Excel descargado del banco, con cabecera (`Date, Description, Debit,
  Credit, Balance` o `Fecha; Concepto; Importe; Saldo`).
- Una tabla copiada de la web del banco, separada por tabuladores.
- La lista de la app del móvil copiada tal cual, aunque cada movimiento ocupe
  varias líneas.
- El propio CSV que exporta esta app, desde *Ajustes*.

Se apaña con las dos formas de escribir números (`1.234,56` y `1,234.56`), con
fechas `12/08/2026`, `2026-08-12` y `12 Ago 2026`, y sabe distinguir la columna
del importe de la del saldo. Los ingresos se detectan y se dejan desmarcados,
porque aquí solo se apuntan gastos.

Antes de guardar sale la lista para revisarla: se puede corregir cualquier campo
y desmarcar lo que no interese. Lo que ya está apuntado ese mes aparece marcado
como tal y desmarcado, así que se puede volver a pegar el extracto entero sin
duplicar nada.

Nada de esto sale del móvil: el texto se analiza en el propio navegador.

### 2. Gastos habituales

Debajo de los botones salen los conceptos que más repetís, con su categoría ya
puesta. Tocas *Careem* y solo tienes que escribir el importe.

### 3. Autocompletado

Al escribir el concepto se sugieren los ya usados, y la categoría se rellena sola
a partir de lo apuntado antes (si «Carrefour MOE» era Supermercado, «Carrefour
City» también lo será). Sigue siendo editable. El botón *Guardar y otro* deja el
formulario listo para el siguiente gasto sin cerrar la ventana, conservando la
fecha.

## Conexión con el banco

Todavía no está conectada: los gastos se apuntan a mano o se pegan del extracto.
Conectarla de verdad requiere contratar un agregador bancario compatible con los
EAU, que es de pago.
