import { useState } from 'react';
import { Car, Plus, User, X } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useCreateCustomer, useCustomerSearch } from '@/hooks/useProducts';
import { errorMessage } from '@/lib/supabase';

export default function CustomerPicker() {
  const customer = useCartStore((s) => s.customer);
  const setCustomer = useCartStore((s) => s.setCustomer);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [plate, setPlate] = useState('');
  const [phone, setPhone] = useState('');
  const { data: results = [] } = useCustomerSearch(q);
  const create = useCreateCustomer();

  if (customer) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-1.5 text-sm">
        <span className="flex items-center gap-2 text-slate-700">
          <User className="h-4 w-4 text-brand-600" /> {customer.name}
          {customer.vehicle_plate_no && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Car className="h-3 w-3" /> {customer.vehicle_plate_no}
            </span>
          )}
        </span>
        <button onClick={() => setCustomer(null)} className="text-slate-400 hover:text-red-600" aria-label="Remove customer">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (creating) {
    return (
      <form
        className="space-y-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!q.trim()) return;
          try {
            const c = await create.mutateAsync({
              name: q.trim(),
              vehicle_plate_no: plate.trim().toUpperCase() || undefined,
              contact_number: phone.trim() || undefined,
            });
            setCustomer({ id: c.id, name: c.name, vehicle_plate_no: c.vehicle_plate_no });
            setCreating(false);
            setQ('');
            setPlate('');
            setPhone('');
          } catch (err) {
            alert(errorMessage(err));
          }
        }}
      >
        <input className="input py-1.5" placeholder="Customer name" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        <div className="flex gap-2">
          <input className="input py-1.5" placeholder="Plate no." value={plate} onChange={(e) => setPlate(e.target.value)} />
          <input className="input py-1.5" placeholder="Contact no." value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex-1 py-1.5" disabled={create.isPending}>Save</button>
          <button type="button" className="btn-secondary py-1.5" onClick={() => setCreating(false)}>Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <div className="relative">
      <input
        className="input py-1.5"
        placeholder="Customer (optional) — name, plate, or phone"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && q && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {results.map((c) => (
            <li key={c.id}>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                onMouseDown={() => {
                  setCustomer({ id: c.id, name: c.name, vehicle_plate_no: c.vehicle_plate_no });
                  setQ('');
                }}
              >
                <div className="font-medium text-slate-800">{c.name}</div>
                <div className="text-xs text-slate-500">
                  {[c.vehicle_plate_no, c.contact_number].filter(Boolean).join(' · ')}
                </div>
              </button>
            </li>
          ))}
          <li>
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-brand-700 hover:bg-brand-50"
              onMouseDown={() => setCreating(true)}
            >
              <Plus className="h-4 w-4" /> New customer “{q}”
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
