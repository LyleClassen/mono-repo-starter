import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import {
  peopleDAO,
  PersonSchema,
  CreatePersonSchema,
  UpdatePersonSchema,
  ListPeopleQuerySchema,
  PersonIdParamSchema,
  PeopleListResponseSchema,
  ErrorResponseSchema,
  type CreatePersonDTO,
  type UpdatePersonDTO,
  type ListPeopleQueryDTO,
  type PersonIdParamDTO,
} from '@repo/database';

const peopleRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /people - List all people with pagination and search
  fastify.get<{ Querystring: ListPeopleQueryDTO }>('/people', {
    schema: {
      description: 'Get a list of all people with pagination and optional search',
      tags: ['people'],
      querystring: ListPeopleQuerySchema,
      response: {
        200: PeopleListResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { limit = 10, offset = 0, search } = request.query;

      const { data, total } = await peopleDAO.findAll({ limit, offset, search });

      return {
        data,
        total,
        limit,
        offset,
      };
    },
  });

  // GET /people/:id - Get a single person by ID
  fastify.get<{ Params: PersonIdParamDTO }>('/people/:id', {
    schema: {
      description: 'Get a person by ID',
      tags: ['people'],
      params: PersonIdParamSchema,
      response: {
        200: PersonSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params;

      const person = await peopleDAO.findById(id);

      if (!person) {
        reply.code(404);
        return {
          error: 'Not Found',
          message: `Person with id ${id} not found`,
        };
      }

      return person;
    },
  });

  // POST /people - Create a new person
  fastify.post<{ Body: CreatePersonDTO }>('/people', {
    schema: {
      description: 'Create a new person',
      tags: ['people'],
      body: CreatePersonSchema,
      response: {
        201: PersonSchema,
        400: ErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const personData = request.body;

      try {
        const newPerson = await peopleDAO.create(personData);

        reply.code(201);
        return newPerson;
      } catch (error: any) {
        reply.code(400);
        return {
          error: 'Bad Request',
          message: error.message || 'Failed to create person',
        };
      }
    },
  });

  // PUT /people/:id - Update a person
  fastify.put<{ Params: PersonIdParamDTO; Body: UpdatePersonDTO }>('/people/:id', {
    schema: {
      description: 'Update a person by ID',
      tags: ['people'],
      params: PersonIdParamSchema,
      body: UpdatePersonSchema,
      response: {
        200: PersonSchema,
        404: ErrorResponseSchema,
        400: ErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params;
      const updateData = request.body;

      try {
        const updatedPerson = await peopleDAO.update(id, updateData);

        if (!updatedPerson) {
          reply.code(404);
          return {
            error: 'Not Found',
            message: `Person with id ${id} not found`,
          };
        }

        return updatedPerson;
      } catch (error: any) {
        reply.code(400);
        return {
          error: 'Bad Request',
          message: error.message || 'Failed to update person',
        };
      }
    },
  });

  // DELETE /people/:id - Delete a person
  fastify.delete<{ Params: PersonIdParamDTO }>('/people/:id', {
    schema: {
      description: 'Delete a person by ID',
      tags: ['people'],
      params: PersonIdParamSchema,
      response: {
        204: Type.Null(),
        404: ErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params;

      const deleted = await peopleDAO.delete(id);

      if (!deleted) {
        reply.code(404);
        return {
          error: 'Not Found',
          message: `Person with id ${id} not found`,
        };
      }

      reply.code(204);
      return null;
    },
  });
};

export default peopleRoutes;
