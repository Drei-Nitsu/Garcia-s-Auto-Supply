import { createPortal } from 'react-dom';
import { STORE_ADDRESS, STORE_NAME, formatDateTime, peso } from '@/lib/utils';
import type { ReceiptData } from '@/types/domain';

/**
 * 80mm thermal receipt. Rendered into #print-root (hidden on screen,
 * the only visible element when printing — see index.css @media print).
 */
export default function Receipt({ data }: { data: ReceiptData }) {
  const vatable = data.total_amount - data.tax;
  const line = '-'.repeat(40);

  return createPortal(
    <div id="print-root">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{STORE_NAME}</div>
        {STORE_ADDRESS && <div>{STORE_ADDRESS}</div>}
        <div>SALES INVOICE</div>
      </div>
      <div>{line}</div>
      <div>Invoice: {data.invoice_number}</div>
      <div>Date: {formatDateTime(data.created_at)}</div>
      <div>Cashier: {data.cashierName}</div>
      {data.customerName && <div>Customer: {data.customerName}</div>}
      <div>{line}</div>

      {data.items.map((i) => (
        <div key={i.productId} style={{ marginBottom: 4 }}>
          <div>{i.name}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>
              {i.quantity} x {peso(i.unitPrice)}
            </span>
            <span>{peso(i.unitPrice * i.quantity)}</span>
          </div>
          {i.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>  Less discount</span>
              <span>-{peso(i.discount)}</span>
            </div>
          )}
        </div>
      ))}

      <div>{line}</div>
      <Row l="Subtotal" r={peso(data.subtotal)} />
      {data.discount > 0 && <Row l="Total discount" r={`-${peso(data.discount)}`} />}
      <Row l="TOTAL" r={peso(data.total_amount)} bold />
      <div>{line}</div>
      <Row l="VATable Sales" r={peso(vatable)} />
      <Row l="VAT (12%)" r={peso(data.tax)} />
      <div>{line}</div>
      <Row l={`Paid (${data.paymentMethod})`} r={peso(data.amount_tendered ?? data.total_amount)} />
      {data.paymentReference && <Row l="Ref #" r={data.paymentReference} />}
      {data.change_due != null && <Row l="Change" r={peso(data.change_due)} bold />}
      <div>{line}</div>
      <div style={{ textAlign: 'center', marginTop: 6 }}>
        Thank you! Please keep this receipt
        <br />
        for returns and warranty claims.
      </div>
    </div>,
    document.body,
  );
}

function Row({ l, r, bold }: { l: string; r: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: bold ? 700 : 400 }}>
      <span>{l}</span>
      <span>{r}</span>
    </div>
  );
}
