"use client";

import { useEffect, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Field, inputClass } from "@/components/ui/field";
import {
  getCatalogVehicle,
  searchCatalog,
  type CatalogVehicle,
} from "../api";

function optionLabel(vehicle: CatalogVehicle) {
  return `${vehicle.brand} ${vehicle.model}${vehicle.year ? ` · ${vehicle.year}` : ""}`;
}

function priceLabel(vehicle: CatalogVehicle) {
  if (vehicle.price === null) return "Sin precio publicado";
  const value = new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: 2,
  }).format(vehicle.price);
  return `${vehicle.priceLabel || "Precio referencial"}: ${vehicle.currency} ${value}`;
}

export function CatalogVehiclePicker({
  value,
  disabled = false,
  onSelect,
  onClear,
}: {
  value?: string;
  disabled?: boolean;
  onSelect: (vehicle: CatalogVehicle) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CatalogVehicle[]>([]);
  const [selected, setSelected] = useState<CatalogVehicle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (!value || selected?.id === value) return;
    let active = true;
    getCatalogVehicle(value).then((item) => {
      if (!active || !item) return;
      setSelected(item);
      setQuery(optionLabel(item));
    }).catch(() => {
      if (active) setSelected(null);
    });
    return () => {
      active = false;
    };
  }, [value, selected?.id]);

  const isSelected = Boolean(selected && selected.id === value);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2 || isSelected) return;
    let active = true;
    const timeout = window.setTimeout(() => {
      setLoading(true);
      searchCatalog(term).then((results) => {
        if (active) {
          setItems(results);
          setActiveIndex(-1);
        }
      }).catch(() => {
        if (active) {
          setItems([]);
          setError("No se pudo consultar el catálogo. Puedes completar los datos manualmente.");
        }
      }).finally(() => {
        if (active) setLoading(false);
      });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [query, isSelected]);

  function search(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    if (isSelected) {
      setSelected(null);
      onClear();
    }
    if (next.trim().length < 2) setItems([]);
    setLoading(false);
    setError("");
    setActiveIndex(-1);
    setQuery(next);
    setOpen(true);
  }

  function choose(vehicle: CatalogVehicle) {
    setSelected(vehicle);
    setItems([]);
    setQuery(optionLabel(vehicle));
    setOpen(false);
    onSelect(vehicle);
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && items.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => index < 0 ? 0 : (index + 1) % items.length);
    } else if (event.key === "ArrowUp" && items.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => index < 0 ? items.length - 1 : (index - 1 + items.length) % items.length);
    } else if (event.key === "Enter" && open && items[activeIndex]) {
      event.preventDefault();
      choose(items[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative md:col-span-2">
      <Field label="Marca o modelo" htmlFor="vehicleCatalogSearch" optional>
        <div className="relative">
          <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="vehicleCatalogSearch"
            className={`${inputClass} pl-10 pr-10`}
            value={query}
            disabled={disabled}
            onChange={search}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onInputKeyDown}
            placeholder="Busca por marca o modelo, por ejemplo Toyota o Corolla"
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open && items.length > 0}
            aria-controls={open && items.length ? "vehicleCatalogOptions" : undefined}
            aria-activedescendant={open && activeIndex >= 0 && items[activeIndex] ? `vehicle-option-${items[activeIndex].id}` : undefined}
          />
          {isSelected
            ? <Check size={16} aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-green-700" />
            : <ChevronDown size={16} aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />}
        </div>
      </Field>

      {isSelected && selected ? (
        <p className="mt-1.5 text-xs text-muted">
          {selected.variant ? `${selected.variant} · ` : ""}
          <span className="font-medium text-primary">{priceLabel(selected)}</span>
          <span> · Selecciona el campo para buscar otro vehículo</span>
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-muted">
          Escribe al menos 2 caracteres. Al elegir un resultado se completarán marca, modelo y datos disponibles; también puedes llenarlos manualmente.
        </p>
      )}

      {loading && <p role="status" className="mt-2 text-xs text-muted">Buscando…</p>}
      {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
      {open && !loading && query.trim().length >= 2 && !error && items.length === 0 && !isSelected && (
        <p className="mt-2 text-xs text-muted">No encontramos coincidencias. Puedes completar los campos manualmente.</p>
      )}
      {open && items.length > 0 && (
        <ul
          id="vehicleCatalogOptions"
          role="listbox"
          aria-label="Vehículos disponibles"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-white shadow-lg"
        >
          {items.map((vehicle, index) => (
            <li
              id={`vehicle-option-${vehicle.id}`}
              key={vehicle.id}
              role="option"
              aria-selected={index === activeIndex}
            >
              <button
                type="button"
                tabIndex={-1}
                disabled={disabled}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(vehicle)}
                className={`flex min-h-14 w-full items-start justify-between gap-3 px-3 py-3 text-left ${index === activeIndex ? "bg-accent-soft/60" : "hover:bg-background"}`}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{vehicle.brand} {vehicle.model}</span>
                  <span className="mt-1 block text-xs text-muted">
                    {[vehicle.year, vehicle.variant].filter(Boolean).join(" · ") || (vehicle.source === "supplier_excel" ? "Proveedor TMB" : "Catálogo web TMB")}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-xs font-semibold text-primary">{priceLabel(vehicle)}</span>
                  <span className="mt-1 block text-[10px] uppercase tracking-wide text-muted">
                    {vehicle.source === "supplier_excel" ? "Excel proveedor" : "Catálogo web"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
