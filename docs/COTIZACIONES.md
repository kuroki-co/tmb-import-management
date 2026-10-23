# Cotizaciones comerciales

La cotización se prepara desde el detalle de una solicitud FRI. La vendedora ingresa FOB y flete internacional; el seguro y los demás importes se calculan a partir de los parámetros base de configuración.

## Cálculo replicado del Excel marítimo

- Seguro internacional = (FOB + flete internacional) × tasa de seguro.
- CIF = FOB + flete internacional + seguro.
- ADV = CIF × tasa ADV.
- IPM = CIF × tasa IPM.
- IGV de importación = CIF × tasa IGV de importación.
- Subtotal de contenido = ADV + IPM + IGV de importación + tasa de despacho.
- Percepción = (CIF + subtotal de contenido) × tasa de percepción.
- Derechos de aduana en soles = subtotal de contenido × tipo de cambio.
- Percepción en soles = percepción × tipo de cambio.
- IGV de gastos locales = suma de transporte, seguro local, flete local, gastos FOB, handling, aduanas, gate in, almacén, V°B° y comisión mínima × tasa de IGV local.
- Subtotal de gastos locales = gastos locales + IGV de gastos locales.
- Total USD = CIF + subtotal de contenido + percepción + subtotal de gastos locales.

Los valores base iniciales reproducen el ejemplo de la hoja: tipo de cambio 3.335; seguro 1.5%; ADV 0%; IPM 2%; IGV de importación 16%; percepción 3.5%; IGV de gastos locales 18%; tasa de despacho 0 USD. Los gastos locales iniciales son 0 para transporte, seguro local, flete local y gastos FOB; USD 300 handling, USD 300 aduanas, USD 280 gate in, USD 800 almacén, USD 320 V°B° y USD 300 comisión mínima. Todos se pueden cambiar en Parámetros de cotización.

Las partidas en cero aparecen como “—” y se computan como cero. Cada cotización conserva una copia de los parámetros base que se usaron; sus ajustes excepcionales se guardan en esa cotización y no alteran la configuración general. Los cambios de configuración solo se aplican a cotizaciones nuevas.

El cálculo conserva precisión completa internamente y presenta importes a dos decimales. Derechos de aduana y percepción en soles son referencias convertidas; el total comercial se presenta en USD.
