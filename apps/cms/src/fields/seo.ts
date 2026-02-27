import type { GroupField } from 'payload'

export const seoField: GroupField = {
  name: 'seo',
  type: 'group',
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
      admin: {
        description: 'Overrides the page title in search results. Recommended: 50-60 characters.',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
      admin: {
        description:
          'Overrides the page description in search results. Recommended: 150-160 characters.',
      },
    },
    {
      name: 'ogImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Image shown when sharing on social media. Recommended: 1200x630px.',
      },
    },
    {
      name: 'noIndex',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Prevent search engines from indexing this page.',
      },
    },
  ],
  admin: {
    description: 'Search engine optimization settings.',
  },
}
