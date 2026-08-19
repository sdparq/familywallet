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

## Puesta en marcha en Netlify

1. Conecta este repositorio en Netlify. La configuración de build ya está en
   `netlify.toml` (comando `npm run build`, carpeta `dist`).
2. En **Site configuration → Environment variables**, crea la variable
   `APP_PASSWORD` con la contraseña compartida. Sin ella la app responde con un
   error explicando que falta.
3. Despliega. La primera vez que se abre, la base de datos se rellena con los
   datos del Excel y a partir de ahí manda lo que se edite en la app.

Los datos viven en **Netlify Blobs**, que se activa solo: no hay que crear ninguna
base de datos ni cuenta adicional.

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
src/lib/apply.ts             Operaciones sobre los datos, compartidas cliente/servidor
src/lib/money.ts             Conversión AED/EUR, presupuesto y totales por categoría
src/lib/store.tsx            Estado de la app y sincronización con el servidor
src/components/              Pantallas: Mes, Año, Ahorros y Ajustes
scripts/extract_seed.py      Importador del Excel
```

## Conexión con el banco

Todavía no está conectada: los gastos se apuntan a mano. La estructura está
preparada para añadirlo más adelante (los movimientos ya tienen fecha, importe,
moneda y categoría), pero requiere contratar un agregador bancario compatible con
los EAU, que es de pago.
