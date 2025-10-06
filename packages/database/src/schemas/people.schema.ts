import { Type, Static } from '@sinclair/typebox';

// Person schema for responses (matches the database table)
export const PersonSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  firstName: Type.String(),
  lastName: Type.String(),
  email: Type.String({ format: 'email' }),
  age: Type.Integer({ minimum: 0 }),
  city: Type.String(),
  country: Type.String(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

// Create person request schema (input validation)
export const CreatePersonSchema = Type.Object({
  firstName: Type.String({ minLength: 1, maxLength: 100 }),
  lastName: Type.String({ minLength: 1, maxLength: 100 }),
  email: Type.String({ format: 'email', maxLength: 255 }),
  age: Type.Integer({ minimum: 0, maximum: 150 }),
  city: Type.String({ minLength: 1, maxLength: 100 }),
  country: Type.String({ minLength: 1, maxLength: 100 }),
});

// Update person request schema (all fields optional)
export const UpdatePersonSchema = Type.Partial(CreatePersonSchema);

// Query parameters for list endpoint
export const ListPeopleQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 10 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
  search: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
});

// Path parameters
export const PersonIdParamSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

// Response schemas
export const PeopleListResponseSchema = Type.Object({
  data: Type.Array(PersonSchema),
  total: Type.Integer(),
  limit: Type.Integer(),
  offset: Type.Integer(),
});

export const ErrorResponseSchema = Type.Object({
  error: Type.String(),
  message: Type.String(),
});

// Export types
export type PersonDTO = Static<typeof PersonSchema>;
export type CreatePersonDTO = Static<typeof CreatePersonSchema>;
export type UpdatePersonDTO = Static<typeof UpdatePersonSchema>;
export type ListPeopleQueryDTO = Static<typeof ListPeopleQuerySchema>;
export type PersonIdParamDTO = Static<typeof PersonIdParamSchema>;
export type PeopleListResponseDTO = Static<typeof PeopleListResponseSchema>;
export type ErrorResponseDTO = Static<typeof ErrorResponseSchema>;
