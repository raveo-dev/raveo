import type { CollectionConfig } from 'payload';
import { isAdmin, isAdminOrEditor } from '../access';

export const FormSubmissions: CollectionConfig = {
  slug: 'form-submissions',
  admin: {
    useAsTitle: 'submittedAt',
    defaultColumns: ['form', 'submittedAt', 'createdAt'],
    group: 'Forms',
  },
  access: {
    // Admin + Editor can read submissions
    read: isAdminOrEditor,
    // Only created programmatically via API (afterChange hook or endpoint)
    create: isAdmin,
    // Submissions are immutable
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'form',
      type: 'relationship',
      relationTo: 'forms',
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'data',
      type: 'json',
      required: true,
      admin: {
        readOnly: true,
        description: 'Raw submission data as key-value pairs.',
      },
    },
    {
      name: 'submittedAt',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: {
        readOnly: true,
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
  ],
};
