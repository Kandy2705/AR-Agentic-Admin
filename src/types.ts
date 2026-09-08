/** Contracts verified against Kandy2705/CO4029_BE, API/Contracts. Preserve underscore fields. */
export type Role = 'Customer' | 'Employee' | 'Admin';
export interface User { id: string | null; name: string | null; email: string | null; phone: string | null; birthday: string | null; gender: string | null; role: Role | null; isActive: boolean; }
export interface LoginResponse { accessToken: string; refreshToken: string; expiresAt: string | null; }
export interface Building { id: string | null; name: string | null; content: string | null; latitude: number | null; longitude: number | null; }
export interface Floor { id: string | null; buildingId: string | null; floorNumber: number; name: string | null; floorPlanUrl: string | null; sourceUrl: string | null; verified: boolean; }
export interface Room { id: string | null; floorId: string | null; roomCode: string | null; name: string | null; description: string | null; roomType: string | null; localX: number | null; localY: number | null; localZ: number | null; sourceUrl: string | null; verified: boolean; }
export interface Category { id: string | null; name: string | null; }
export interface Question { id: string | null; content: string | null; name: string | null; email: string | null; createDate: string | null; categoryId: string | null; userId: string | null; }
export interface Answer { id: string | null; content: string | null; createDate: string | null; questionId: string | null; userId: string | null; }
export interface History { id: string | null; header: string | null; create_date: string | null; userId: string | null; }
export interface Chatbox { id: string | null; content: string | null; contact_time: string | null; contact_person: string | null; }
export interface Page<T> { items: T[]; page: number; pageSize: number; totalItems: number; totalPages: number; }
export interface Dashboard { totalUsers: number; activeUsers: number; disabledUsers: number; totalBuildings: number; totalQuestions: number; totalAnswers: number; totalCategories: number; totalHistories: number; totalChatboxes: number; }
export interface UserUpdate { name: string; phone: string; birthday: string | null; gender: string; role?: Role; }
export interface BuildingInput { name: string; content: string; latitude: number | null; longitude: number | null; }
export interface FloorInput { floorNumber: number; name: string | null; floorPlanUrl: string | null; sourceUrl: string | null; verified: boolean; }
export interface FloorUpdate { floorNumber: number | null; name: string | null; floorPlanUrl: string | null; sourceUrl: string | null; verified: boolean | null; }
export interface RoomInput { roomCode: string; name: string | null; description: string | null; roomType: string | null; localX: number | null; localY: number | null; localZ: number | null; sourceUrl: string | null; verified: boolean; }
export interface RoomUpdate { roomCode: string | null; name: string | null; description: string | null; roomType: string | null; localX: number | null; localY: number | null; localZ: number | null; sourceUrl: string | null; verified: boolean | null; }
export interface QuestionInput { content: string; name: string; email: string; createDate: string | null; categoryId: string | null; userId: string | null; }
export interface AnswerInput { content: string; createdDate: string | null; questionId: string; userId: string | null; }
export type Params = Record<string, string | number | boolean | null | undefined>;
