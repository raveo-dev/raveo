import type { CollectionConfig } from 'payload';
import { isAdmin } from '../access';

export const Forms: CollectionConfig = {
  slug: 'forms',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'updatedAt'],
    group: 'Forms',
  },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Unique identifier used in frontend. e.g. "contact"',
      },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            if (value) return value;
            if (data?.title) {
              return data.title
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
            }
          },
        ],
      },
    },
    {
      name: 'fields',
      type: 'array',
      required: true,
      minRows: 1,
      admin: {
        description: 'Define the form fields that users will fill out.',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          admin: {
            description: 'Field key, e.g. "email", "message". Used as form field name attribute.',
          },
        },
        {
          name: 'label',
          type: 'text',
          required: true,
          localized: true,
          admin: {
            description: 'Display label shown to the user.',
          },
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          options: [
            { label: 'Text', value: 'text' },
            { label: 'Email', value: 'email' },
            { label: 'Textarea', value: 'textarea' },
            { label: 'Select', value: 'select' },
            { label: 'Checkbox', value: 'checkbox' },
          ],
          defaultValue: 'text',
        },
        {
          name: 'required',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'options',
          type: 'array',
          admin: {
            description: 'Only used for "select" field type.',
            condition: (_, siblingData) => siblingData?.type === 'select',
          },
          fields: [
            {
              name: 'label',
              type: 'text',
              required: true,
              localized: true,
            },
            {
              name: 'value',
              type: 'text',
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: 'submitLabel',
      type: 'text',
      defaultValue: 'Submit',
      localized: true,
      admin: {
        description: 'Text shown on the submit button.',
      },
    },
    {
      name: 'confirmationMessage',
      type: 'textarea',
      localized: true,
      admin: {
        description: 'Message shown after successful submission.',
      },
    },
    {
      name: 'emailNotification',
      type: 'group',
      admin: {
        description: 'Optional email notification on new submission.',
      },
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'recipientEmail',
          type: 'email',
          admin: {
            condition: (_, siblingData) => siblingData?.enabled,
            description: 'Email address to notify on new submissions.',
          },
        },
        {
          name: 'subject',
          type: 'text',
          defaultValue: 'New form submission',
          admin: {
            condition: (_, siblingData) => siblingData?.enabled,
          },
        },
      ],
    },
  ],
};
