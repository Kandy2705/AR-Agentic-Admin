import { z } from 'zod';
import { emptyToNull } from '@/lib/utils';
import { optionalNumber, optionalUrl, toNumberOrNull } from '@/lib/validation';
import type { Building, BuildingInput, Floor, FloorInput, Room, RoomInput } from '@/types/api';

// ---- Building ---------------------------------------------------------------

export const buildingSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(200),
  content: z.string().max(10000),
  latitude: optionalNumber(-90, 90),
  longitude: optionalNumber(-180, 180),
});
export type BuildingValues = z.infer<typeof buildingSchema>;

export const toBuildingForm = (building?: Building | null): BuildingValues => ({
  name: building?.name ?? '',
  content: building?.content ?? '',
  latitude: building?.latitude?.toString() ?? '',
  longitude: building?.longitude?.toString() ?? '',
});

/** A missing coordinate stays `null` (zero is a valid coordinate). */
export const toBuildingInput = (values: BuildingValues): BuildingInput => ({
  name: values.name.trim(),
  content: values.content.trim(),
  latitude: toNumberOrNull(values.latitude),
  longitude: toNumberOrNull(values.longitude),
});

// ---- Floor ------------------------------------------------------------------

export const floorSchema = z.object({
  floorNumber: z
    .string()
    .trim()
    .min(1, 'Floor number is required.')
    .refine((value) => Number.isInteger(Number(value)), 'Floor number must be an integer.'),
  name: z.string().trim().max(200),
  floorPlanUrl: optionalUrl,
  sourceUrl: optionalUrl,
  verified: z.boolean(),
});
export type FloorValues = z.infer<typeof floorSchema>;

export const toFloorForm = (floor?: Floor | null): FloorValues => ({
  floorNumber: String(floor?.floorNumber ?? 0),
  name: floor?.name ?? '',
  floorPlanUrl: floor?.floorPlanUrl ?? '',
  sourceUrl: floor?.sourceUrl ?? '',
  verified: floor?.verified ?? false,
});

export const toFloorInput = (values: FloorValues): FloorInput => ({
  floorNumber: Number(values.floorNumber),
  name: emptyToNull(values.name),
  floorPlanUrl: emptyToNull(values.floorPlanUrl),
  sourceUrl: emptyToNull(values.sourceUrl),
  verified: values.verified,
});

// ---- Room -------------------------------------------------------------------

export const roomSchema = z.object({
  roomCode: z.string().trim().min(1, 'Room code is required.').max(100),
  name: z.string().trim().max(200),
  roomType: z.string().trim().max(200),
  description: z.string().max(5000),
  localX: optionalNumber(),
  localY: optionalNumber(),
  localZ: optionalNumber(),
  sourceUrl: optionalUrl,
  verified: z.boolean(),
});
export type RoomValues = z.infer<typeof roomSchema>;

export const toRoomForm = (room?: Room | null): RoomValues => ({
  roomCode: room?.roomCode ?? '',
  name: room?.name ?? '',
  roomType: room?.roomType ?? '',
  description: room?.description ?? '',
  localX: room?.localX?.toString() ?? '',
  localY: room?.localY?.toString() ?? '',
  localZ: room?.localZ?.toString() ?? '',
  sourceUrl: room?.sourceUrl ?? '',
  verified: room?.verified ?? false,
});

export const toRoomInput = (values: RoomValues): RoomInput => ({
  roomCode: values.roomCode.trim(),
  name: emptyToNull(values.name),
  description: emptyToNull(values.description),
  roomType: emptyToNull(values.roomType),
  localX: toNumberOrNull(values.localX),
  localY: toNumberOrNull(values.localY),
  localZ: toNumberOrNull(values.localZ),
  sourceUrl: emptyToNull(values.sourceUrl),
  verified: values.verified,
});
