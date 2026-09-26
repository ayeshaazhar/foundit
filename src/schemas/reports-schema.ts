import type { CollectionSchema } from 'deepspace/schema'

export const reportsSchema: CollectionSchema = {
  name: 'reports',

  columns: [
    {
      name: 'type',
      storage: 'text',
      interpretation: {
        kind: 'select',
        options: ['lost', 'found'],
      },
      required: true,
    },

    {
      name: 'title',
      storage: 'text',
      interpretation: 'plain',
      required: true,
    },

    {
      name: 'description',
      storage: 'text',
      interpretation: 'plain',
      required: true,
    },

    {
      name: 'category',
      storage: 'text',
      interpretation: {
        kind: 'select',
        options: [
          'electronics',
          'wallet',
          'keys',
          'clothing',
          'documents',
          'other',
        ],
      },
      required: true,
    },

    {
      name: 'location',
      storage: 'text',
      interpretation: 'plain',
      required: true,
    },

    {
      name: 'eventDate',
      storage: 'number',
      interpretation: {
        kind: 'date',
      },
      required: true,
    },

    {
      name: 'createdBy',
      storage: 'text',
      interpretation: 'plain',
      userBound: true,
      immutable: true,
      required: true,
    },

    {
      name: 'status',
      storage: 'text',
      interpretation: {
        kind: 'select',
        options: ['open', 'matched'],
      },
      default: 'open',
      required: true,
    },
  ],

  ownerField: 'createdBy',

  permissions: {
    viewer: {
      read: true,
      create: false,
      update: false,
      delete: false,
    },

    member: {
      read: true,
      create: true,
      update: 'own',
      delete: 'own',
    },

    admin: {
      read: true,
      create: true,
      update: true,
      delete: true,
    },
  },
}