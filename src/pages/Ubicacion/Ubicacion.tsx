import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MapPin,
  Crosshair,
  RefreshCw,
  Loader2,
  TriangleAlert,
  Clock,
  UserRound,
  Route as RouteIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import type { LatLngBoundsExpression, LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageHeader } from '../../components/ui/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/ui/buttons';
import { ContentCard } from '../../components/ui/ContentCard';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  getMiPaciente,
  getMiPlan,
  getUbicacionActual,
  getRutaUbicaciones,
  ApiError,
  type UbicacionGpsResponse,
} from '../../lib/api';
import './Ubicacion.css';

type Rango = '24h' | '7d' | '30d';

const RANGOS: { id: Rango; label: string }[] = [
  { id: '24h', label: '24 horas' },
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
];

const MS_HORA = 60 * 60 * 1000;

function errMsg(err: unknown, fallback = 'Ocurrió un error inesperado. Intenta de nuevo.') {
  return err instanceof ApiError ? err.message : fallback;
}

// El backend puede devolver los campos en camelCase o PascalCase;
// esta normalización hace la vista tolerante a ambas variantes.
function normalizarUbicacion(raw: unknown): UbicacionGpsResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const pick = (...keys: string[]) => {
    for (const k of keys) if (o[k] != null) return o[k];
    return undefined;
  };
  const lat = Number(pick('latitud', 'Latitud', 'lat', 'latitude'));
  const lng = Number(pick('longitud', 'Longitud', 'lng', 'lon', 'long', 'longitude'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const id = pick('id', 'Id');
  const pacienteId = pick('pacienteId', 'PacienteId');
  const precision = pick('precision', 'precisionM', 'Precision');
  const tipo = pick('tipo', 'Tipo', 'tipoUbicacion');
  const tsRaw = pick('timestamp', 'fecha', 'fechaHora', 'fechaCreacion', 'Timestamp', 'FechaCreacion');
  const ts = tsRaw != null ? new Date(String(tsRaw)).toISOString() : new Date().toISOString();

  return {
    ...(id != null ? { id: String(id) } : {}),
    ...(pacienteId != null ? { pacienteId: String(pacienteId) } : {}),
    latitud: lat,
    longitud: lng,
    precision: precision != null ? Number(precision) : null,
    ...(tipo != null ? { tipo: String(tipo) } : {}),
    timestamp: ts,
  };
}

function tiempoDesde(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (!Number.isFinite(min) || min < 0) return 'ahora mismo';
  if (min < 1) return 'hace unos segundos';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

function formatearCoordenada(v: number): string {
  return Number.isFinite(v) ? v.toFixed(6) : '—';
}

function formatearFechaHora(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function distanciaMetros(a: UbicacionGpsResponse, b: UbicacionGpsResponse): number {
  const R = 6371000;
  const dLat = ((b.latitud - a.latitud) * Math.PI) / 180;
  const dLng = ((b.longitud - a.longitud) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.latitud * Math.PI) / 180) *
      Math.cos((b.latitud * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function limitesRango(rango: Rango): { desde: string; hasta: string } {
  const hasta = new Date();
  const ms = rango === '24h' ? 24 * MS_HORA : rango === '7d' ? 7 * 24 * MS_HORA : 30 * 24 * MS_HORA;
  return { desde: new Date(hasta.getTime() - ms).toISOString(), hasta: hasta.toISOString() };
}

const iconoActual = L.divIcon({
  className: 'ubicacion__marker-wrap ubicacion__marker-wrap--actual',
  html: '<span class="ubicacion__dot"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const iconoInicio = L.divIcon({
  className: 'ubicacion__marker-wrap ubicacion__marker-wrap--inicio',
  html: '<span class="ubicacion__dot"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, bounds]);
  return null;
}

export function Ubicacion() {
  const navigate = useNavigate();
  const [pacienteId, setPacienteId] = useState<string | null>(null);
  const [nombrePaciente, setNombrePaciente] = useState('');
  const [planGps, setPlanGps] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [actual, setActual] = useState<UbicacionGpsResponse | null>(null);
  const [ruta, setRuta] = useState<UbicacionGpsResponse[]>([]);
  const [rango, setRango] = useState<Rango>('24h');
  const [cargandoActual, setCargandoActual] = useState(false);
  const [cargandoRuta, setCargandoRuta] = useState(false);
  const [actualError, setActualError] = useState('');
  const [rutaError, setRutaError] = useState('');

  const cargarActual = useCallback(async (id: string) => {
    setCargandoActual(true);
    setActualError('');
    try {
      const res = await getUbicacionActual(id);
      setActual(normalizarUbicacion(res));
    } catch (err) {
      setActualError(errMsg(err));
    } finally {
      setCargandoActual(false);
    }
  }, []);

  const cargarRuta = useCallback(async (id: string, r: Rango) => {
    setCargandoRuta(true);
    setRutaError('');
    try {
      const { desde, hasta } = limitesRango(r);
      const res = await getRutaUbicaciones(id, desde, hasta);
      setRuta((res ?? []).map(normalizarUbicacion).filter((p): p is UbicacionGpsResponse => p != null));
    } catch (err) {
      setRutaError(errMsg(err));
    } finally {
      setCargandoRuta(false);
    }
  }, []);

  useEffect(() => {
    let activo = true;
    (async () => {
      setLoading(true);
      setPageError('');
      try {
        const p = await getMiPaciente();
        if (!activo) return;
        if (p) {
          setPacienteId(p.id);
          setNombrePaciente(p.nombre);
          cargarActual(p.id);
        } else {
          setPacienteId(null);
          setNombrePaciente('');
        }
        try {
          const plan = await getMiPlan();
          if (activo) setPlanGps(plan.gpsContinuo);
        } catch {
          if (activo) setPlanGps(null);
        }
      } catch (err) {
        if (activo) setPageError(errMsg(err));
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [cargarActual, cargarRuta]);

  useEffect(() => {
    if (!pacienteId) return;
    cargarRuta(pacienteId, rango);
  }, [pacienteId, rango, cargarRuta]);

  useEffect(() => {
    if (!pacienteId) return;
    const t = setInterval(() => cargarActual(pacienteId), 30000);
    return () => clearInterval(t);
  }, [pacienteId, cargarActual]);

  const puntosRuta = useMemo<LatLngTuple[]>(
    () => ruta.map((p) => [p.latitud, p.longitud]),
    [ruta],
  );

  const distanciaTotal = useMemo(() => {
    let total = 0;
    for (let i = 1; i < ruta.length; i++) total += distanciaMetros(ruta[i - 1], ruta[i]);
    return total;
  }, [ruta]);

  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    const pts = puntosRuta.length > 0 ? puntosRuta : actual ? [[actual.latitud, actual.longitud]] : [];
    if (pts.length === 0) return null;
    if (pts.length === 1) return [pts[0], pts[0]] as LatLngBoundsExpression;
    return pts as LatLngBoundsExpression;
  }, [puntosRuta, actual]);

  const centro: LatLngTuple = actual
    ? [actual.latitud, actual.longitud]
    : puntosRuta[0] ?? [19.4326, -99.1332];

  const esEmergencia = actual?.tipo === 'emergencia';
  const sinPaciente = !loading && !pacienteId && !pageError;
  const planBloqueado = planGps === false;

  const mapaListo =
    !planBloqueado && !sinPaciente && (actual != null || ruta.length > 0) && !cargandoActual;

  const botonActualizar =
    !sinPaciente && !planBloqueado ? (
      <SecondaryButton onClick={() => pacienteId && cargarActual(pacienteId)} disabled={cargandoActual}>
        <RefreshCw size={14} strokeWidth={1.8} className={cargandoActual ? 'ubicacion__spin' : ''} />
        Actualizar
      </SecondaryButton>
    ) : undefined;

  return (
    <DashboardLayout>
      <PageHeader
        title="Ubicación"
        subtitle={
          nombrePaciente
            ? `Última ubicación conocida de ${nombrePaciente}`
            : 'Monitoreo de ubicación del paciente en tiempo real'
        }
        onBack={() => navigate('/dashboard')}
        action={botonActualizar}
      />

      {pageError && (
        <div className="modal__error" style={{ marginBottom: 20 }} role="alert">
          {pageError}
        </div>
      )}

      {esEmergencia && (
        <div className="ubicacion__emergencia" role="alert">
          <TriangleAlert size={18} strokeWidth={2} />
          <div>
            <b>Ubicación de emergencia</b>
            <span>El paciente activó una señal de emergencia en esta ubicación.</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="ubicacion__cargando">
          <Loader2 size={24} strokeWidth={1.8} className="ubicacion__spin" />
          Cargando ubicación…
        </div>
      ) : planBloqueado ? (
        <ContentCard>
          <EmptyState
            icon={<MapPin size={26} strokeWidth={1.6} />}
            title="GPS continuo no incluido"
            description="Mejora tu plan para monitorear la ubicación del paciente en tiempo real"
            action={
              <PrimaryButton onClick={() => navigate('/planes')}>
                Ver planes disponibles
              </PrimaryButton>
            }
          />
        </ContentCard>
      ) : sinPaciente ? (
        <ContentCard>
          <EmptyState
            icon={<UserRound size={26} strokeWidth={1.6} />}
            title="Sin paciente vinculado"
            description="Crea o vincula un paciente para monitorear su ubicación"
            action={
              <PrimaryButton onClick={() => navigate('/pacientes')}>
                Ir a Pacientes
              </PrimaryButton>
            }
          />
        </ContentCard>
      ) : (
        <div className="ubicacion__grid">
          <ContentCard className="ubicacion__map-card">
            {actualError && !actual && (
              <div className="modal__error" style={{ marginBottom: 16 }} role="alert">
                {actualError}
              </div>
            )}
            {cargandoActual && !actual && ruta.length === 0 ? (
              <div className="ubicacion__cargando">
                <Loader2 size={22} strokeWidth={1.8} className="ubicacion__spin" />
                Obteniendo última ubicación…
              </div>
            ) : !mapaListo && actual == null && ruta.length === 0 ? (
              <EmptyState
                icon={<MapPin size={26} strokeWidth={1.6} />}
                title="Sin datos GPS todavía"
                description="Vincula la App Móvil al paciente para comenzar a registrar su ubicación"
              />
            ) : (
              <div className="ubicacion__map">
                <MapContainer
                  center={centro}
                  zoom={14}
                  scrollWheelZoom={false}
                  zoomControl={false}
                  className="ubicacion__map-container"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  />
                  <ZoomControl position="bottomright" />
                  {puntosRuta.length > 0 && (
                    <>
                      <Polyline positions={puntosRuta} pathOptions={{ color: 'var(--cyan)', weight: 3, opacity: 0.9 }} />
                      <Marker position={puntosRuta[0]} icon={iconoInicio} />
                    </>
                  )}
                  {actual && (
                    <Marker position={[actual.latitud, actual.longitud]} icon={iconoActual} />
                  )}
                  <FitBounds bounds={bounds} />
                </MapContainer>
                <div className="ubicacion__legend">
                  {actual && (
                    <span className="ubicacion__legend-item">
                      <i className="ubicacion__legend-dot ubicacion__legend-dot--actual" />
                      Posición actual
                    </span>
                  )}
                  {puntosRuta.length > 0 && (
                    <span className="ubicacion__legend-item">
                      <i className="ubicacion__legend-dot ubicacion__legend-dot--inicio" />
                      Inicio de ruta
                    </span>
                  )}
                  {puntosRuta.length > 0 && (
                    <span className="ubicacion__legend-item">
                      <i className="ubicacion__legend-line" />
                      Recorrido
                    </span>
                  )}
                </div>
              </div>
            )}
          </ContentCard>

          <div className="ubicacion__side">
            <ContentCard>
              <div className="ubicacion__card-header">
                <Crosshair size={16} strokeWidth={1.8} style={{ color: 'var(--cyan)' }} />
                <h3 className="ubicacion__card-title">Última ubicación</h3>
                {actual ? (
                  <span className="ubicacion__live">
                    <span className="ubicacion__live-dot" />
                    En vivo
                  </span>
                ) : null}
              </div>

              {cargandoActual && !actual ? (
                <p className="ubicacion__muted">Actualizando posición…</p>
              ) : actual ? (
                <div className="ubicacion__info">
                  <div className="ubicacion__coord">
                    <span className="ubicacion__coord-label">LATITUD</span>
                    <span className="ubicacion__coord-value">{formatearCoordenada(actual.latitud)}</span>
                  </div>
                  <div className="ubicacion__coord">
                    <span className="ubicacion__coord-label">LONGITUD</span>
                    <span className="ubicacion__coord-value">{formatearCoordenada(actual.longitud)}</span>
                  </div>
                  {actual.precision != null && actual.precision > 0 && (
                    <div className="ubicacion__coord">
                      <span className="ubicacion__coord-label">PRECISIÓN</span>
                      <span className="ubicacion__coord-value">±{Math.round(actual.precision)} m</span>
                    </div>
                  )}
                  <div className="ubicacion__coord">
                    <span className="ubicacion__coord-label">ACTUALIZACIÓN</span>
                    <span className="ubicacion__coord-value">
                      {tiempoDesde(actual.timestamp)} · {formatearFechaHora(actual.timestamp)}
                    </span>
                  </div>
                  {actual.tipo && actual.tipo !== 'continua' && (
                    <div className="ubicacion__coord">
                      <span className="ubicacion__coord-label">TIPO</span>
                      <span className="ubicacion__coord-value">{actual.tipo}</span>
                    </div>
                  )}
                  {actualError && <p className="ubicacion__error">{actualError}</p>}
                </div>
              ) : (
                <EmptyState
                  icon={<Crosshair size={22} strokeWidth={1.6} />}
                  title="Sin posición reciente"
                  description="Aún no hay una ubicación registrada por la App Móvil"
                />
              )}
            </ContentCard>

            <ContentCard>
              <div className="ubicacion__card-header">
                <RouteIcon size={16} strokeWidth={1.8} style={{ color: 'var(--blue)' }} />
                <h3 className="ubicacion__card-title">Ruta registrada</h3>
              </div>

              <div className="ubicacion__range">
                {RANGOS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`ubicacion__range-btn ${rango === r.id ? 'ubicacion__range-btn--active' : ''}`}
                    onClick={() => setRango(r.id)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {cargandoRuta ? (
                <p className="ubicacion__muted">
                  <Loader2 size={13} strokeWidth={2} className="ubicacion__spin" /> Cargando ruta…
                </p>
              ) : rutaError ? (
                <p className="ubicacion__error">{rutaError}</p>
              ) : ruta.length > 0 ? (
                <div className="ubicacion__route-stats">
                  <div className="ubicacion__stat">
                    <span className="ubicacion__stat-value">{ruta.length}</span>
                    <span className="ubicacion__stat-label">puntos</span>
                  </div>
                  <div className="ubicacion__stat">
                    <span className="ubicacion__stat-value">
                      {distanciaTotal >= 1000
                        ? `${(distanciaTotal / 1000).toFixed(2)}`
                        : `${Math.round(distanciaTotal)}`}
                    </span>
                    <span className="ubicacion__stat-label">
                      {distanciaTotal >= 1000 ? 'km recorridos' : 'm recorridos'}
                    </span>
                  </div>
                  <div className="ubicacion__stat">
                    <span className="ubicacion__stat-value">
                      {new Date(ruta[0].timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="ubicacion__stat-label">inicio</span>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={<Clock size={22} strokeWidth={1.6} />}
                  title="Sin ruta en este rango"
                  description="No hay movimientos registrados en el periodo seleccionado"
                />
              )}
            </ContentCard>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
