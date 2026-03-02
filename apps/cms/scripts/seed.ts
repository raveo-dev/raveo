import { getPayload } from 'payload';
import config from '../src/payload.config';

async function seed() {
  const payload = await getPayload({ config: await config });

  console.log('🌱 Seeding database...');

  // Create admin user
  const existingUsers = await payload.find({
    collection: 'users',
    limit: 1,
  });
  // biome-ignore lint/suspicious/noImplicitAnyLet: assigned conditionally below
  let adminUser;

  if (existingUsers.totalDocs === 0) {
    adminUser = await payload.create({
      collection: 'users',
      data: {
        email: 'admin@example.com',
        password: 'password',
        role: 'admin',
      },
    });
    console.log('✅ Admin user created: admin@example.com / password');
  } else {
    adminUser = existingUsers.docs[0];
    console.log('⏭️  Admin user already exists, skipping');
  }

  // Create site settings
  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      siteName: 'My Raveo Site',
      siteDescription: 'Built with Raveo — Payload CMS on Cloudflare Workers',
    },
  });
  console.log('✅ Site settings created');

  // Create navigation
  await payload.updateGlobal({
    slug: 'navigation',
    data: {
      items: [
        { label: 'Home', href: '/' },
        { label: 'Blog', href: '/blog' },
        { label: 'About', href: '/about' },
      ],
    },
  });
  console.log('✅ Navigation created');

  // Create categories
  const category = await payload.create({
    collection: 'categories',
    data: {
      name: 'General',
      slug: 'general',
      description: 'General posts and updates',
    },
  });
  console.log('✅ Category created: General');

  // Create homepage
  await payload.create({
    collection: 'pages',
    data: {
      title: 'Home',
      slug: 'home',
      status: 'published',
      hero: {
        heading: 'Welcome to Raveo',
        subheading: 'A Payload CMS boilerplate on Cloudflare Workers',
      },
    },
  });
  console.log('✅ Homepage created');

  // Create sample posts
  const posts = [
    {
      title: 'Getting Started with Raveo',
      slug: 'getting-started-with-raveo',
      excerpt: 'Learn how to set up and use the Raveo boilerplate for your next project.',
      status: 'published' as const,
    },
    {
      title: 'Deploying to Cloudflare Workers',
      slug: 'deploying-to-cloudflare-workers',
      excerpt: 'A step-by-step guide to deploying your Raveo project to Cloudflare Workers.',
      status: 'published' as const,
    },
    {
      title: 'Draft Post Example',
      slug: 'draft-post-example',
      excerpt: 'This is an example of a draft post.',
      status: 'draft' as const,
    },
  ];

  for (const post of posts) {
    await payload.create({
      collection: 'posts',
      draft: true,
      data: {
        ...post,
        author: adminUser.id,
        categories: [category.id],
      },
    });
  }
  console.log('✅ Sample posts created');

  console.log('🎉 Seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
