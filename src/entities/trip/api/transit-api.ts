import type { TransitRoute, VehicleObservation } from '../model/trip';
export interface RouteSummary { readonly id: string; readonly name: string; readonly direction: string }
export interface TransitVehicle extends VehicleObservation { readonly registration: string; readonly currentStopId: string }
export interface TransitDataPort {
  routes(): Promise<readonly RouteSummary[]>;
  route(id: string): Promise<TransitRoute>;
  vehicles(id: string): Promise<readonly TransitVehicle[]>;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('버스 정보 형식을 확인할 수 없어요.');
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('버스 정보 형식을 확인할 수 없어요.');
  return value;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('버스 정보 형식을 확인할 수 없어요.');
  return value;
}
function sequence(value: unknown): number {
  const result = number(value);
  if (!Number.isInteger(result) || result < 0) throw new Error('정류장 순서가 올바르지 않아요.');
  return result;
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('버스 정보 형식을 확인할 수 없어요.');
  return value;
}
function summary(value: unknown): RouteSummary {
  const item = record(value);
  return { id: text(item['id']), name: text(item['name']), direction: text(item['direction']) };
}
export function createTransitApi(base: string): TransitDataPort {
  async function get(path: string): Promise<unknown> {
    if (!base) throw new Error('버스 정보 서버 연결을 준비하고 있어요.');
    let response: Response;
    try { response = await fetch(`${base.replace(/\/$/, '')}${path}`, { signal: AbortSignal.timeout(12000) }); }
    catch { throw new Error('버스 정보를 가져오지 못했어요. 연결을 확인하고 다시 시도해 주세요.'); }
    if (!response.ok) throw new Error('버스 정보 제공이 지연되고 있어요. 잠시 후 다시 시도해 주세요.');
    return response.json();
  }
  return {
    async routes() { return array(await get('/routes')).map(summary); },
    async route(id) {
      const item = record(await get(`/routes/${encodeURIComponent(id)}`));
      const route = summary(item);
      if (route.id !== id) throw new Error('선택한 노선과 정보가 일치하지 않아요.');
      return { ...route, stops: array(item['stops']).map(value => {
        const stop = record(value); return { id: text(stop['id']), name: text(stop['name']), sequence: sequence(stop['sequence']) };
      }) };
    },
    async vehicles(id) {
      return array(await get(`/routes/${encodeURIComponent(id)}/vehicles`)).map(value => {
        const vehicle = record(value);
        if (vehicle['routeId'] !== id) throw new Error('선택한 노선과 차량이 일치하지 않아요.');
        return { vehicleId: text(vehicle['vehicleId']), routeId: id, reachedSequence: sequence(vehicle['reachedSequence']),
          observedAt: number(vehicle['observedAt']), registration: text(vehicle['registration']), currentStopId: text(vehicle['currentStopId']) };
      });
    },
  };
}
