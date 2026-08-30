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
- **El mes es real.** Ingresos y gastos se apuntan a mano; el balance del mes es
  ingresos menos lo gastado. Ninguna previsión toca esas cifras.
- **Previsiones** es una pestaña aparte: ingresos previstos menos gastos fijos
  previstos da el margen del que se puede tirar para ahorrar, y se compara con lo
  que de verdad se gastó de media.
- **Gastos que se repiten.** Un gasto fijo marcado como recurrente se apunta solo
  al abrir cada mes nuevo, con su importe, moneda y categoría.
- **Posibles duplicados.** Dentro de un mes, los gastos con el mismo concepto e
  importe se resaltan en rojo y se pueden ver aparte.
- **Ordenado por día.** Los gastos se agrupan por fecha, del más reciente al más
  antiguo, con el total de cada día. Cambiar la fecha de un gasto lo mueve de día
  y, si hace falta, de mes.
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
src/components/              Pantallas: Mes, Año y Previsiones
scripts/extract_seed.py      Importador del Excel
```

## De dónde salen los datos

Todo lo que trae la app viene del Excel, sin añadidos: 447 movimientos (enero y
abril a julio), las tres líneas de ingresos, los 15 gastos fijos, las 19
categorías y el tipo de cambio. `src/data/seed.json` se puede regenerar con el
script y sale byte a byte igual.

Los meses que no tenían nada en el Excel —febrero, marzo y de agosto a
diciembre— aparecen como **Sin datos**: no suman en los totales del año, no
pintan barra en el gráfico, y al abrirlos se avisa de que los ingresos que se ven
son la previsión, no lo que se cobró de verdad.

Los 15 gastos fijos del Excel siguen en *Previsiones*. Son una estimación: no
restan en ningún mes. Conviene dejar solo los que se saben seguro —el alquiler,
por ejemplo— y quitar el resto con la ×.

Solo 101 de los 447 movimientos traían fecha en el Excel. Los otros 346 conservan
la semana en la que estaban anotados y se agrupan como *Semana N · sin fecha*,
colocados donde caía esa semana: ni se les inventa un día ni se pierden. Al
editar uno se le puede poner la fecha real y pasa a su día.

## Gastos recurrentes

En *Previsiones*, cada gasto fijo tiene la casilla **Apuntarlo solo en cada mes
nuevo**. Los marcados se añaden como movimientos reales la primera vez que se
abre un mes, con fecha el día 1 (se puede cambiar como cualquier otro gasto).

Vienen marcados siete: Alquiler Piso (8.000 AED), LinkedIn (22,99 AED), Claude
suscripción (418,26 AED), Google One (21,99 €), Seguro España Santi (54,67 €),
Seguro España Bea (67,79 €) y Fertilitas (151,25 €). El resto de gastos fijos del
Excel siguen siendo solo previsión hasta que se marquen.

Reglas que evitan sorpresas:

- Solo desde `settings.recurringFrom` (agosto de 2026). Los meses anteriores ya
  los tenían apuntados en el Excel y no se tocan.
- El id de cada movimiento es fijo por gasto y mes, así que abrir el mismo mes a
  la vez desde dos móviles no lo duplica.
- Se anota gasto a gasto en `seededItems`, no el mes entero. Así, si luego se
  borra uno, no reaparece al volver a entrar; y marcar un gasto nuevo como
  recurrente lo añade también a un mes que ya estuviera abierto.

## Posibles duplicados

Dos gastos del mismo mes con **el mismo concepto, importe y moneda** se marcan en
rojo, con la etiqueta *posible duplicado*. La cabecera de la lista dice cuántos
hay y permite ver solo esos.

No se exige que coincida la fecha, porque la mayoría de los movimientos que
vienen del Excel no la tienen. Es una sospecha, no una certeza: un comercio puede
cobrar lo mismo dos veces de verdad, así que la app solo lo señala y nunca borra
nada. Sobre los 447 movimientos del Excel marca 8, en cuatro parejas.

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

## Ahorros

La pestaña de ahorros está retirada: descontaba una cantidad fija todos los meses
y el ahorro real varía de un mes a otro. El disponible ya no la resta.

Los datos (cuentas, fondos de emergencia y provisiones) siguen guardados en
`savings`, con su operación `savings.set` y su sitio en el seed, esperando a que
se monten los objetivos de ahorro. No hay que volver a meterlos.

## Conexión con el banco

Todavía no está conectada: los gastos se apuntan a mano o se pegan del extracto.
Conectarla de verdad requiere contratar un agregador bancario compatible con los
EAU, que es de pago.
