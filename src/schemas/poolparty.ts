import { z } from 'zod';

export const PeopleCount = z.number().int().min(1).max(2);
export const MusicInput = z.string().max(500).optional().nullable();
export const DurationInput = z.string().trim().min(1).max(60);

// ========== Private: me ==========

export const MePayload = z.object({
  item: z.object({ id: z.number().int(), name: z.string() }).nullable(),
  volunteer: z
    .object({ duration: z.string(), updatedAt: z.number().int() })
    .nullable(),
  registration: z
    .object({
      peopleCount: PeopleCount,
      music: z.string().nullable(),
      updatedAt: z.number().int(),
    })
    .nullable(),
});
export type MePayload = z.infer<typeof MePayload>;

// ========== Private: item ==========

export const ItemListItem = z.object({ id: z.number().int(), name: z.string() });
export const ItemList = z.array(ItemListItem);

// ========== Private: registration ==========

export const CreateRegistrationBody = z.object({
  peopleCount: PeopleCount,
  itemId: z.number().int().positive(),
  music: MusicInput,
});
export type CreateRegistrationBody = z.infer<typeof CreateRegistrationBody>;

export const UpdateRegistrationBody = z
  .object({
    peopleCount: PeopleCount.optional(),
    itemId: z.number().int().positive().optional(),
    music: MusicInput,
  })
  .refine(
    (val) => val.peopleCount !== undefined || val.itemId !== undefined || val.music !== undefined,
    { message: 'At least one field must be provided' }
  );
export type UpdateRegistrationBody = z.infer<typeof UpdateRegistrationBody>;

// ========== Private: volunteer ==========

export const CreateVolunteerBody = z.object({ duration: DurationInput });
export type CreateVolunteerBody = z.infer<typeof CreateVolunteerBody>;

// ========== Admin ==========

export const AdminAccountList = z.array(
  z.object({
    id: z.number().int(),
    name: z.string(),
    email: z.string(),
    emailVerifiedAt: z.number().int().nullable(),
    lastActivityAt: z.number().int(),
    createdAt: z.number().int(),
    roles: z.array(z.string()),
  })
);

export const AdminRegistrationList = z.array(
  z.object({
    id: z.number().int(),
    accountId: z.number().int(),
    accountName: z.string().nullable(),
    peopleCount: z.number().int(),
    music: z.string().nullable(),
    updatedAt: z.number().int(),
  })
);

export const AdminItemList = z.array(
  z.object({
    id: z.number().int(),
    itemName: z.string(),
    accountName: z.string().nullable(),
    accountId: z.number().int().nullable(),
    updatedAt: z.number().int(),
  })
);

export const AdminVolunteerList = z.array(
  z.object({
    id: z.number().int(),
    accountId: z.number().int(),
    accountName: z.string().nullable(),
    duration: z.string(),
    updatedAt: z.number().int(),
  })
);

export const AdminAuditLogList = z.array(
  z.object({
    id: z.number().int(),
    accountId: z.number().int().nullable(),
    eventType: z.string(),
    message: z.string(),
    meta: z.string().nullable(),
    ipAddress: z.string().nullable(),
    userAgent: z.string().nullable(),
    createdAt: z.number().int(),
  })
);

export const AdminCreateItemBody = z.object({ name: z.string().trim().min(1).max(200) });

export const IdParam = z.object({ id: z.coerce.number().int().positive() });

export const OkReply = z.object({ ok: z.literal(true) });
