// ============================================================
//  Etiquetas de los PDF en los cuatro idiomas
// ============================================================
// ---------------------------------------------------------
//  TRADUCCIONES DEL PDF (labels)
// ---------------------------------------------------------
const TR = {
  es: { talla:'Talla', factura:'FACTURA', numero:'N°', facturarA:'FACTURAR A', fecha:'FECHA',
    moneda:'MONEDA DE PAGO', monedaXG:'Florines (XCG)', monedaUSD:'Dólares (USD)',
    descripcion:'DESCRIPCIÓN', cantidad:'CANT.', precio:'PRECIO', subtotal:'SUBTOTAL',
    totalPagar:'TOTAL A PAGAR', equivalente:'Equivalente',
    totalItems:'Total de ítems', cantidadTotal:'Cantidad total',
    notas:'NOTAS', codigo:'Cód', cliente:'Cliente',
    telefono:'Tel', email:'Email', direccion:'Dir',
    gracias:'¡Gracias por su preferencia!', generado:'Documento generado el',
    sinDescripcion:'(sin descripción)',
    pagado:'PAGADO', saldo:'SALDO PENDIENTE', historialPagos:'Historial de pagos',
    abonos:'ABONOS', totalPagado:'Total pagado', abono:'Abono',
    estadoPagada:'PAGADA', estadoParcial:'PAGO PARCIAL', estadoPendiente:'PENDIENTE',
    bon:'BON DE CAJA', cajero:'Cajero', formaPago:'FORMA DE PAGO',
    recibido:'RECIBIDO', vuelto:'CAMBIO / VUELTO', articulos:'Artículos', piezas:'Piezas',
    crib:'Crib', obNr:'OB nr.', referencia:'Ref.', pagina:'Página', dePag:'de',
    atendidoPor:'Atendido por', tasaUsada:'Tasa usada', sinSaldo:'Sin saldo pendiente',
    condiciones:'CONDICIONES' },
  en: { talla:'Size', factura:'INVOICE', numero:'N°', facturarA:'BILL TO', fecha:'DATE',
    moneda:'PAYMENT CURRENCY', monedaXG:'Florins (XCG)', monedaUSD:'Dollars (USD)',
    descripcion:'DESCRIPTION', cantidad:'QTY', precio:'PRICE', subtotal:'SUBTOTAL',
    totalPagar:'TOTAL DUE', equivalente:'Equivalent',
    totalItems:'Total items', cantidadTotal:'Total quantity',
    notas:'NOTES', codigo:'Code', cliente:'Customer',
    telefono:'Phone', email:'Email', direccion:'Address',
    gracias:'Thank you for your business!', generado:'Document generated on',
    sinDescripcion:'(no description)',
    pagado:'PAID', saldo:'BALANCE DUE', historialPagos:'Payment history',
    abonos:'PAYMENTS', totalPagado:'Total paid', abono:'Payment',
    estadoPagada:'PAID', estadoParcial:'PARTIAL', estadoPendiente:'UNPAID',
    bon:'CASH RECEIPT', cajero:'Cashier', formaPago:'PAYMENT',
    recibido:'RECEIVED', vuelto:'CHANGE', articulos:'Items', piezas:'Units',
    crib:'Crib', obNr:'OB no.', referencia:'Ref.', pagina:'Page', dePag:'of',
    atendidoPor:'Served by', tasaUsada:'Rate used', sinSaldo:'No balance due',
    condiciones:'TERMS' },
  nl: { talla:'Maat', factura:'FACTUUR', numero:'Nr.', facturarA:'FACTUREREN AAN', fecha:'DATUM',
    moneda:'BETAALMUNT', monedaXG:'Florijnen (XCG)', monedaUSD:'Dollars (USD)',
    descripcion:'OMSCHRIJVING', cantidad:'AANT.', precio:'PRIJS', subtotal:'SUBTOTAAL',
    totalPagar:'TE BETALEN', equivalente:'Gelijkwaardig',
    totalItems:'Totaal artikelen', cantidadTotal:'Totale hoeveelheid',
    notas:'OPMERKINGEN', codigo:'Code', cliente:'Klant',
    telefono:'Tel', email:'Email', direccion:'Adres',
    gracias:'Bedankt voor uw bestelling!', generado:'Document gegenereerd op',
    sinDescripcion:'(geen omschrijving)',
    pagado:'BETAALD', saldo:'OPENSTAAND', historialPagos:'Betalingsgeschiedenis',
    abonos:'BETALINGEN', totalPagado:'Totaal betaald', abono:'Betaling',
    estadoPagada:'BETAALD', estadoParcial:'DEELS BETAALD', estadoPendiente:'ONBETAALD',
    bon:'KASSABON', cajero:'Kassier', formaPago:'BETALING',
    recibido:'ONTVANGEN', vuelto:'WISSELGELD', articulos:'Artikelen', piezas:'Stuks',
    crib:'Crib', obNr:'OB nr.', referencia:'Ref.', pagina:'Pagina', dePag:'van',
    atendidoPor:'Geholpen door', tasaUsada:'Gebruikte koers', sinSaldo:'Niets openstaand',
    condiciones:'VOORWAARDEN' },
  pap: { talla:'Midí', factura:'FAKTURA', numero:'No.', facturarA:'FAKTURÁ NA', fecha:'FECHA',
    moneda:'MONEDA DI PAGO', monedaXG:'Florin (XCG)', monedaUSD:'Dòler (USD)',
    descripcion:'DESKRIPSHON', cantidad:'KANT.', precio:'PRESIO', subtotal:'SUBTOTAL',
    totalPagar:'TOTAL PA PAGA', equivalente:'Ekivalente',
    totalItems:'Total di artíkulo', cantidadTotal:'Kantidat total',
    notas:'NOTANAN', codigo:'Kódigo', cliente:'Kliente',
    telefono:'Telefon', email:'Email', direccion:'Direkshon',
    gracias:'Danki pa bo prefershi!', generado:'Dokumento generá riba',
    sinDescripcion:'(sin deskripshon)',
    pagado:'PAGÁ', saldo:'SALDO PA PAGA', historialPagos:'Historia di pago',
    abonos:'PAGONAN', totalPagado:'Total pagá', abono:'Pago',
    estadoPagada:'PAGÁ', estadoParcial:'PAGO PARSIAL', estadoPendiente:'PENDIENTE',
    bon:'BON DI KAHA', cajero:'Kahero', formaPago:'FORMA DI PAGO',
    recibido:'RISIBÍ', vuelto:'KAMBIO', articulos:'Artíkulonan', piezas:'Pida',
    crib:'Crib', obNr:'OB nr.', referencia:'Ref.', pagina:'Pagina', dePag:'di',
    atendidoPor:'Atendí pa', tasaUsada:'Tasa usá', sinSaldo:'No tin saldo pendiente',
    condiciones:'KONDISHONNAN' }
};

// Etiquetas extra de GestRend (formas de pago y venta sin productos)
const EXTRA = {
  es:  { efectivo: 'Efectivo', tarjeta: 'Tarjeta', venta: 'Venta', clienteMostrador: 'Cliente de mostrador' },
  en:  { efectivo: 'Cash', tarjeta: 'Card', venta: 'Sale', clienteMostrador: 'Walk-in customer' },
  nl:  { efectivo: 'Contant', tarjeta: 'Pin/kaart', venta: 'Verkoop', clienteMostrador: 'Toonbankklant' },
  pap: { efectivo: 'Kèsh', tarjeta: 'Karchi', venta: 'Benta', clienteMostrador: 'Kliente di mostrado' },
};
for (const k of Object.keys(TR)) Object.assign(TR[k], EXTRA[k]);

module.exports = { TR };

