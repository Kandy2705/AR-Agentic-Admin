import { safeId } from '@/lib/http/api-client';
import type { Building, BuildingInput, Floor, FloorInput, Room, RoomInput } from '@/types/api';
import { http } from './http';

export const buildingsService = {
  list: (signal?: AbortSignal) => http.get<Building[]>('/buildings', signal),
  get: (id: string, signal?: AbortSignal) => http.get<Building>(`/buildings/${safeId(id)}`, signal),
  /** Create requires the current Admin as owner; update must not send it. */
  create: (body: BuildingInput & { userId: string }) => http.post<Building>('/buildings', body),
  update: (id: string, body: BuildingInput) => http.put<Building>(`/buildings/${safeId(id)}`, body),
  remove: (id: string) => http.remove(`/buildings/${safeId(id)}`),
};

export const floorsService = {
  list: (buildingId: string, signal?: AbortSignal) =>
    http.get<Floor[]>(`/buildings/${safeId(buildingId)}/floors`, signal),
  create: (buildingId: string, body: FloorInput) =>
    http.post<Floor>(`/buildings/${safeId(buildingId)}/floors`, body),
  update: (floorId: string, body: FloorInput) =>
    http.put<Floor>(`/floors/${safeId(floorId)}`, body),
  remove: (floorId: string) => http.remove(`/floors/${safeId(floorId)}`),
};

export const roomsService = {
  list: (floorId: string, signal?: AbortSignal) =>
    http.get<Room[]>(`/floors/${safeId(floorId)}/rooms`, signal),
  create: (floorId: string, body: RoomInput) =>
    http.post<Room>(`/floors/${safeId(floorId)}/rooms`, body),
  update: (roomId: string, body: RoomInput) => http.put<Room>(`/rooms/${safeId(roomId)}`, body),
  remove: (roomId: string) => http.remove(`/rooms/${safeId(roomId)}`),
};
