import { useEffect, useRef, useState } from "react";
import { CalendarDays, Crosshair, MapPin, Navigation, Search } from "lucide-react";
import { Map as MapLibre, Marker, NavigationControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Lead } from "../types";
import { queryAll } from "../lib/queryAll.js";
import { supabase } from "../lib/supabase";
import { isTaskAssignedTo } from "../lib/teamAccess.js";
import { Button } from "./ui/button";

type Point = [longitude: number, latitude: number];
type Location = { case_id: string; address_snapshot: string; longitude: number; latitude: number };
type Draft = { caseId: string; latitude: string; longitude: string };
type AddressMatch = { point: Point; label: string };

const tileUrl = import.meta.env.VITE_VISIT_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const attribution = import.meta.env.VITE_VISIT_MAP_ATTRIBUTION || '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>';
const geocoderUrl = import.meta.env.VITE_VISIT_MAP_GEOCODER_URL || "https://photon.komoot.io/api/";
const addressOf = (lead: Lead) => lead.address?.trim() || "";
const markerColor = (lead: Lead) => lead.is_insurance_claim ? "#176081" : "#91571e";

export default function ContractorVisitMap({ cases, organizationId, currentUserId, showTeamVisits, onOpenCase }: {
  cases: Lead[];
  organizationId: string;
  currentUserId: string;
  showTeamVisits: boolean;
  onOpenCase: (lead: Lead) => void;
}) {
  const mapHost = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre | null>(null);
  const centered = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationState, setLocationState] = useState<"loading" | "ready" | "error">("loading");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [todayOnly, setTodayOnly] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [addressMatches, setAddressMatches] = useState<AddressMatch[]>([]);
  const [findingAddress, setFindingAddress] = useState(false);
  const addressRequest = useRef<AbortController | null>(null);

  const today = new Date().toLocaleDateString("sv-SE");
  const visits = cases.flatMap(lead => ["Finalizado", "Cancelado", "Negados"].includes(lead.status) ? [] :
    lead.tasks.filter(task => task.status === "pending" && task.kind && task.kind !== "task" &&
      task.dueDate === today && (showTeamVisits || isTaskAssignedTo(task, currentUserId)))
      .map(task => ({ lead, task })))
    .sort((a, b) => (a.task.scheduledTime || "99:99").localeCompare(b.task.scheduledTime || "99:99"));
  const matches = (lead: Lead) => (!status || lead.status === status) &&
    `${lead.name} ${addressOf(lead)}`.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es"));
  const visibleVisits = visits.filter(({ lead }) => matches(lead));
  const visibleCases = todayOnly
    ? [...new Map(visibleVisits.map(({ lead }) => [lead.id, lead])).values()]
    : cases.filter(matches);
  const byCase = new globalThis.Map(locations.map(location => [location.case_id, location]));
  const pointFor = (lead: Lead): Point | undefined => {
    const location = byCase.get(lead.id);
    if (location && location.address_snapshot === addressOf(lead)) return [location.longitude, location.latitude];
  };
  const pins = visibleCases.flatMap(lead => {
    const point = pointFor(lead);
    return point ? [{ lead, point }] : [];
  });
  const selected = visibleCases.find(lead => lead.id === selectedId);
  const selectedPoint = selected && pointFor(selected);
  const activeDraft = selected && draft?.caseId === selected.id ? draft : null;

  useEffect(() => {
    let current = true;
    void queryAll((from, to) => supabase.from("contractor_case_locations")
      .select("case_id,address_snapshot,latitude,longitude").eq("organization_id", organizationId)
      .order("case_id").range(from, to)).then(({ data, error }) => {
      if (!current) return;
      if (!error) setLocations(data || []);
      setLocationState(error ? "error" : "ready");
    }).catch(() => { if (current) setLocationState("error"); });
    return () => { current = false; };
  }, [organizationId, loadAttempt]);

  useEffect(() => {
    if (!mapHost.current) return;
    let map: MapLibre;
    try {
      map = new MapLibre({
        container: mapHost.current,
        center: [-96, 38],
        zoom: 3,
        renderWorldCopies: false,
        style: {
          version: 8,
          sources: { streets: { type: "raster", tiles: [tileUrl], tileSize: 256, maxzoom: 19, attribution } },
          layers: [{ id: "streets", type: "raster", source: "streets" }],
        },
      });
    } catch {
      setMapError(true);
      return;
    }
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => setMapReady(true));
    return () => { mapRef.current = null; map.remove(); };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const markers = pins.map(({ lead, point }) => {
      const marker = new Marker({ color: markerColor(lead), scale: lead.id === selectedId ? 1.1 : 0.85 })
        .setLngLat(point).addTo(map);
      const element = marker.getElement();
      element.setAttribute("role", "button");
      element.setAttribute("aria-label", lead.name);
      element.tabIndex = 0;
      element.onclick = event => { event.stopPropagation(); selectCase(lead.id, point); };
      element.onkeydown = event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectCase(lead.id, point);
        }
      };
      return marker;
    });
    if (pins.length && !centered.current) {
      centered.current = true;
      if (pins.length === 1) map.jumpTo({ center: pins[0].point, zoom: 14 });
      else {
        const lng = pins.map(({ point }) => point[0]);
        const lat = pins.map(({ point }) => point[1]);
        map.fitBounds([[Math.min(...lng), Math.min(...lat)], [Math.max(...lng), Math.max(...lat)]], { padding: 54, maxZoom: 14, duration: 0 });
      }
    }
    return () => markers.forEach(marker => marker.remove());
  }, [mapReady, locations, cases, selectedId, todayOnly, search, status, today, saving, showTeamVisits, currentUserId]);

  useEffect(() => {
    const map = mapRef.current;
    const point = activeDraft && parsePoint(activeDraft);
    if (!map || !mapReady || !point) return;
    const marker = new Marker({ color: "#2b7966" }).setLngLat(point).addTo(map);
    return () => { marker.remove(); };
  }, [mapReady, activeDraft]);

  function selectCase(id: string, point?: Point) {
    if (saving) return;
    setSelectedId(id);
    setDraft(null);
    setAddressMatches([]);
    setMessage("");
    if (point) mapRef.current?.easeTo({ center: point, zoom: Math.max(mapRef.current.getZoom(), 14), duration: 350 });
  }

  async function findAddress(lead: Lead) {
      if (findingAddress) return;
    addressRequest.current?.abort();
    const controller = new AbortController();
    addressRequest.current = controller;
    setFindingAddress(true);
    setAddressMatches([]);
    setMessage("");
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const url = new URL(geocoderUrl);
      url.searchParams.set("q", addressOf(lead));
      url.searchParams.set("limit", "5");
      const response = await fetch(url, { signal: controller.signal, credentials: "omit" });
      if (!response.ok) throw new Error("Geocoder unavailable");
      const { features } = await response.json() as { features?: {
        geometry?: { type: string; coordinates: number[] };
        properties?: { name?: string; street?: string; housenumber?: string; city?: string; state?: string; postcode?: string };
      }[] };
      if (controller.signal.aborted) return;
      const matches = (features || []).flatMap(({ geometry, properties }) => {
        if (geometry?.type !== "Point") return [];
        const [lng, lat] = geometry.coordinates;
        const point = parsePoint({ caseId: lead.id, latitude: String(lat), longitude: String(lng) });
        if (!point || !properties) return [];
        const street = [properties.housenumber, properties.street].filter(Boolean).join(" ");
        return [{ point, label: [street || properties.name, properties.city, properties.state, properties.postcode].filter(Boolean).join(", ") }];
      });
      setAddressMatches(matches);
      if (!matches.length) setMessage("No encontramos esa dirección. Revisa que el expediente incluya calle, ciudad y estado.");
    } catch {
      if (!controller.signal.aborted) setMessage("No se pudo consultar el servicio de direcciones. Inténtalo de nuevo.");
    } finally {
      window.clearTimeout(timeout);
      setFindingAddress(false);
    }
  }

  async function saveLocation(lead: Lead, point: Point) {
    if (!point || saving) return;
    setSaving(true);
    setMessage("");
    const row = { case_id: lead.id, organization_id: organizationId, address_snapshot: addressOf(lead), longitude: point[0], latitude: point[1] };
    try {
      const { error } = await supabase.from("contractor_case_locations").upsert(row, { onConflict: "case_id,organization_id" });
      if (error) throw error;
      setLocations(previous => [...previous.filter(item => item.case_id !== row.case_id), row]);
      setDraft(null);
      setMessage("Ubicación guardada.");
    } catch {
      setMessage("No se pudo guardar. Puede faltar activar la tabla de ubicaciones en Supabase. Pide al administrador que ejecute schema_contractor_visit_map.sql y luego vuelve a cargar el mapa.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => () => { addressRequest.current?.abort(); }, []);

  const fieldClass = "min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800";
  const caseButton = (lead: Lead, title: string, time?: string) => (
    <button type="button" onClick={() => selectCase(lead.id, pointFor(lead))} disabled={saving}
      aria-pressed={selectedId === lead.id} className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left hover:bg-slate-100 aria-pressed:bg-[#e6f0f3]">
      <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: markerColor(lead) }} />
      <span className="min-w-0 flex-1">
        <span className="block break-words text-sm font-semibold">{title}</span>
        <span className="block break-words text-xs text-slate-600">{addressOf(lead) || "Dirección pendiente"}</span>
        <span className="block text-xs text-slate-600">{lead.status}{pointFor(lead) ? "" : " · Sin ubicar"}</span>
      </span>
      {time && <span className="text-xs font-semibold tabular-nums">{time.slice(0, 5)}</span>}
    </button>
  );

  return <section className="h-full overflow-y-auto bg-[#f4f7f6] p-4 text-[#102a46] md:p-7">
    <div className="mx-auto max-w-[1500px]">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#286653]">Operaciones de campo</p>
          <h1 className="text-3xl font-bold tracking-tight">Mapa de visitas</h1>
          <p className="mt-1 text-sm text-slate-600">Consulta tu agenda y ubica las propiedades de tus casos.</p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Vista del mapa">
          <Button variant={todayOnly ? "default" : "outline"} aria-pressed={todayOnly} disabled={saving} onClick={() => setTodayOnly(true)}><CalendarDays /> Visitas de hoy</Button>
          <Button variant={!todayOnly ? "default" : "outline"} aria-pressed={!todayOnly} disabled={saving} onClick={() => setTodayOnly(false)}><MapPin /> Todos los casos</Button>
        </div>
      </header>
      {locationState === "error" && <div role="alert" className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold">Falta activar el guardado de ubicaciones.</p>
        <p className="mt-1">La base de datos de Xapcon todavía no tiene la tabla del mapa. El administrador debe abrir Supabase, entrar en SQL Editor, pegar y ejecutar el archivo <code className="rounded bg-amber-100 px-1">schema_contractor_visit_map.sql</code> del proyecto, y volver a cargar esta página.</p>
        <button type="button" className="mt-2 font-semibold underline" onClick={() => { setLocationState("loading"); setLoadAttempt(value => value + 1); }}>Ya se ejecutó, volver a comprobar</button>
      </div>}
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-[#e3ebe6]">
          <div ref={mapHost} role="region" aria-label="Mapa interactivo de propiedades" className="h-[42vh] min-h-64 xl:h-full xl:min-h-[540px]" />
          {mapError && <p role="status" className="absolute inset-x-4 top-4 rounded-lg bg-white p-3 text-sm">El mapa no está disponible en este navegador. Puedes usar la lista y editar las coordenadas.</p>}
          {!mapError && <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-3 rounded-lg bg-white px-3 py-2 text-xs shadow">
            <span className="text-[#176081]">● Reclamos</span><span className="text-[#91571e]">● Prospectos</span>
          </div>}
        </div>
        <aside className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="grid gap-2">
            <label className="relative"><Search aria-hidden="true" className="absolute left-3 top-2.5 size-4 text-slate-500" />
              <input aria-label="Buscar caso" placeholder="Buscar nombre o dirección" className={`${fieldClass} w-full pl-9`} disabled={saving} value={search} onChange={event => setSearch(event.target.value)} />
            </label>
            <select aria-label="Filtrar por estado" className={fieldClass} value={status} disabled={saving} onChange={event => setStatus(event.target.value)}>
              <option value="">Todos los estados</option>
              {[...new Set(cases.map(lead => lead.status))].sort().map(value => <option key={value}>{value}</option>)}
            </select>
          </div>
          <h2 className="mb-2 mt-4 text-sm font-semibold">{todayOnly ? `${visibleVisits.length} visitas de hoy` : `${visibleCases.length} casos`} · {pins.length} ubicados</h2>
          <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
            {todayOnly
              ? visibleVisits.map(({ lead, task }) => <li key={`${lead.id}:${task.id}`}>{caseButton(lead, `${task.title} · ${lead.name}`, task.scheduledTime)}</li>)
              : visibleCases.map(lead => <li key={lead.id}>{caseButton(lead, lead.name)}</li>)}
          </ul>
          {!visibleCases.length && <p className="py-4 text-sm text-slate-600">{todayOnly ? "No hay visitas pendientes para hoy con estos filtros." : "No hay casos que coincidan con estos filtros."}</p>}
          {selected && <div className="mt-3 grid gap-2 border-t border-slate-200 pt-4">
            <h3 className="break-words font-semibold">{selected.name}</h3>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onOpenCase(selected)}>Abrir expediente</Button>
              {selectedPoint && <a className="inline-flex items-center gap-1.5 rounded-lg bg-[#176081] px-3 py-2 text-xs font-semibold text-white"
                href={`om://v2/nav?origin=currentLocation&destination=${selectedPoint[1]},${selectedPoint[0]}&mode=drive`}><Navigation className="size-3.5" /> Abrir en Organic Maps</a>}
              {locationState === "ready" && !activeDraft && <Button size="sm" variant="outline" onClick={() => {
                setMessage("");
                setAddressMatches([]);
                setDraft({ caseId: selected.id, latitude: selectedPoint?.[1].toString() ?? "", longitude: selectedPoint?.[0].toString() ?? "" });
              }}><Crosshair /> {selectedPoint ? "Corregir ubicación" : "Ubicar propiedad"}</Button>}
            </div>
            {selectedPoint && <p className="text-xs text-slate-600">Para navegar sin conexión, descarga antes la región en Organic Maps.</p>}
            {activeDraft && <div className="grid gap-2">
              <p className="text-xs text-slate-600">Busca la dirección para ubicar la propiedad. Se enviará a Photon, el servicio de búsqueda basado en OpenStreetMap.</p>
              {!addressOf(selected) && <p role="status" className="text-sm text-amber-800">Este expediente no tiene dirección. Agrégala para poder ubicarlo en el mapa.</p>}
              {addressOf(selected) && <div className="grid gap-1">
                <Button className="justify-self-start" type="button" size="sm" variant="outline" disabled={saving || findingAddress}
                  onClick={() => void findAddress(selected)}><Search /> {findingAddress ? "Buscando…" : "Buscar esta dirección"}</Button>
                {addressMatches.map(({ point, label }, index) => <Button key={index} type="button" size="sm" variant="ghost" disabled={saving}
                  className="h-auto justify-start whitespace-normal text-left" onClick={() => {
                    setAddressMatches([]);
                    mapRef.current?.easeTo({ center: point, zoom: 17 });
                    void saveLocation(selected, point);
                  }}>{label || point.join(", ")}</Button>)}
              </div>}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" type="button" variant="ghost" disabled={saving} onClick={() => setDraft(null)}>Cancelar</Button>
              </div>
            </div>}
            {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
          </div>}
        </aside>
      </div>
    </div>
  </section>;
}

function parsePoint({ latitude, longitude }: Draft): Point | undefined {
  if (!latitude.trim() || !longitude.trim()) return;
  const lat = Number(latitude.replace(",", "."));
  const lng = Number(longitude.replace(",", "."));
  if (lat >= -85 && lat <= 85 && lng >= -180 && lng <= 180) return [lng, lat];
}
