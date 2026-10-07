import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { idOf } from '@/lib/utils';
import { buildingsService, floorsService, roomsService } from '@/services/buildings.service';
import { queryKeys } from '@/services/query-keys';
import type { BuildingInput, Floor, FloorInput, Room, RoomInput } from '@/types/api';

export interface FloorWithRooms {
  floor: Floor;
  rooms: Room[];
}

export function useBuildings() {
  return useQuery({
    queryKey: queryKeys.buildings.list(),
    queryFn: ({ signal }) => buildingsService.list(signal),
  });
}

export function useBuilding(id: string) {
  return useQuery({
    queryKey: queryKeys.buildings.detail(id),
    queryFn: ({ signal }) => buildingsService.get(id, signal),
  });
}

/** Floors of a building with their rooms (rooms are fetched in parallel). */
export function useBuildingStructure(buildingId: string) {
  return useQuery({
    queryKey: queryKeys.buildings.structure(buildingId),
    queryFn: async ({ signal }): Promise<FloorWithRooms[]> => {
      const floors = await floorsService.list(buildingId, signal);
      const sorted = [...floors].sort((a, b) => a.floorNumber - b.floorNumber);
      return Promise.all(
        sorted.map(async (floor) => ({
          floor,
          rooms: await roomsService.list(idOf(floor), signal),
        })),
      );
    },
  });
}

function useInvalidateBuildings() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.buildings.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  };
}

export function useSaveBuilding() {
  const invalidate = useInvalidateBuildings();
  return useMutation({
    mutationFn: ({ id, body, ownerId }: { id?: string; body: BuildingInput; ownerId: string }) =>
      id
        ? buildingsService.update(id, body)
        : buildingsService.create({ ...body, userId: ownerId }),
    onSuccess: invalidate,
  });
}

/** Only lists are refreshed: refetching the deleted record's detail would just 404. */
export function useDeleteBuilding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: buildingsService.remove,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.buildings.list() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

function useInvalidateStructure(buildingId: string) {
  const queryClient = useQueryClient();
  return () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.buildings.structure(buildingId) });
}

export function useSaveFloor(buildingId: string) {
  const invalidate = useInvalidateStructure(buildingId);
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: FloorInput }) =>
      id ? floorsService.update(id, body) : floorsService.create(buildingId, body),
    onSuccess: invalidate,
  });
}

export function useDeleteFloor(buildingId: string) {
  const invalidate = useInvalidateStructure(buildingId);
  return useMutation({ mutationFn: floorsService.remove, onSuccess: invalidate });
}

export function useSaveRoom(buildingId: string) {
  const invalidate = useInvalidateStructure(buildingId);
  return useMutation({
    mutationFn: ({ id, floorId, body }: { id?: string; floorId: string; body: RoomInput }) =>
      id ? roomsService.update(id, body) : roomsService.create(floorId, body),
    onSuccess: invalidate,
  });
}

export function useDeleteRoom(buildingId: string) {
  const invalidate = useInvalidateStructure(buildingId);
  return useMutation({ mutationFn: roomsService.remove, onSuccess: invalidate });
}
