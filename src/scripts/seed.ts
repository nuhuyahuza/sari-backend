import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create permissions
  console.log('Creating permissions...');
  const permissions = await Promise.all([
    // User permissions
    prisma.permission.upsert({
      where: { module_action: { module: 'users', action: 'create' } },
      update: {},
      create: {
        name: 'Create Users',
        description: 'Can create new users',
        module: 'users',
        action: 'create'
      }
    }),
    prisma.permission.upsert({
      where: { module_action: { module: 'users', action: 'read' } },
      update: {},
      create: {
        name: 'Read Users',
        description: 'Can view user information',
        module: 'users',
        action: 'read'
      }
    }),
    prisma.permission.upsert({
      where: { module_action: { module: 'users', action: 'update' } },
      update: {},
      create: {
        name: 'Update Users',
        description: 'Can update user information',
        module: 'users',
        action: 'update'
      }
    }),
    prisma.permission.upsert({
      where: { module_action: { module: 'users', action: 'delete' } },
      update: {},
      create: {
        name: 'Delete Users',
        description: 'Can delete users',
        module: 'users',
        action: 'delete'
      }
    }),

    // Role permissions
    prisma.permission.upsert({
      where: { module_action: { module: 'roles', action: 'create' } },
      update: {},
      create: {
        name: 'Create Roles',
        description: 'Can create new roles',
        module: 'roles',
        action: 'create'
      }
    }),
    prisma.permission.upsert({
      where: { module_action: { module: 'roles', action: 'read' } },
      update: {},
      create: {
        name: 'Read Roles',
        description: 'Can view role information',
        module: 'roles',
        action: 'read'
      }
    }),
    prisma.permission.upsert({
      where: { module_action: { module: 'roles', action: 'update' } },
      update: {},
      create: {
        name: 'Update Roles',
        description: 'Can update role information',
        module: 'roles',
        action: 'update'
      }
    }),
    prisma.permission.upsert({
      where: { module_action: { module: 'roles', action: 'delete' } },
      update: {},
      create: {
        name: 'Delete Roles',
        description: 'Can delete roles',
        module: 'roles',
        action: 'delete'
      }
    }),

    // Research permissions
    prisma.permission.upsert({
      where: { module_action: { module: 'researches', action: 'create' } },
      update: {},
      create: {
        name: 'Create Research',
        description: 'Can create new research documents',
        module: 'researches',
        action: 'create'
      }
    }),
    prisma.permission.upsert({
      where: { module_action: { module: 'researches', action: 'read' } },
      update: {},
      create: {
        name: 'Read Research',
        description: 'Can view research documents',
        module: 'researches',
        action: 'read'
      }
    }),
    prisma.permission.upsert({
      where: { module_action: { module: 'researches', action: 'update' } },
      update: {},
      create: {
        name: 'Update Research',
        description: 'Can update research documents',
        module: 'researches',
        action: 'update'
      }
    }),
    prisma.permission.upsert({
      where: { module_action: { module: 'researches', action: 'delete' } },
      update: {},
      create: {
        name: 'Delete Research',
        description: 'Can delete research documents',
        module: 'researches',
        action: 'delete'
      }
    }),

    // File permissions
    prisma.permission.upsert({
      where: { module_action: { module: 'files', action: 'read' } },
      update: {},
      create: {
        name: 'Read Files',
        description: 'Can view and download files',
        module: 'files',
        action: 'read'
      }
    }),
    prisma.permission.upsert({
      where: { module_action: { module: 'files', action: 'delete' } },
      update: {},
      create: {
        name: 'Delete Files',
        description: 'Can delete files',
        module: 'files',
        action: 'delete'
      }
    }),

    // Log permissions
    prisma.permission.upsert({
      where: { module_action: { module: 'logs', action: 'read' } },
      update: {},
      create: {
        name: 'Read Logs',
        description: 'Can view audit logs',
        module: 'logs',
        action: 'read'
      }
    })
  ]);

  console.log(`✅ Created ${permissions.length} permissions`);

  // Get all permission IDs
  const allPermissionIds = permissions.map(p => p.id);

  // Create Admin role with all permissions
  console.log('Creating Admin role...');
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {
      permissions: {
        set: allPermissionIds.map(id => ({ id }))
      }
    },
    create: {
      name: 'Admin',
      description: 'Full system administrator with all permissions',
      permissions: {
        connect: allPermissionIds.map(id => ({ id }))
      }
    }
  });

  // Create Researcher role with limited permissions
  console.log('Creating Researcher role...');
  const researcherPermissions = permissions.filter(p => 
    ['researches', 'files'].includes(p.module)
  ).map(p => p.id);

  const researcherRole = await prisma.role.upsert({
    where: { name: 'Researcher' },
    update: {
      permissions: {
        set: researcherPermissions.map(id => ({ id }))
      }
    },
    create: {
      name: 'Researcher',
      description: 'Can manage research documents and files',
      permissions: {
        connect: researcherPermissions.map(id => ({ id }))
      }
    }
  });

  // Create Viewer role with read-only permissions
  console.log('Creating Viewer role...');
  const viewerPermissions = permissions.filter(p => 
    p.action === 'read' && ['researches', 'files'].includes(p.module)
  ).map(p => p.id);

  const viewerRole = await prisma.role.upsert({
    where: { name: 'Viewer' },
    update: {
      permissions: {
        set: viewerPermissions.map(id => ({ id }))
      }
    },
    create: {
      name: 'Viewer',
      description: 'Read-only access to research documents and files',
      permissions: {
        connect: viewerPermissions.map(id => ({ id }))
      }
    }
  });

  console.log('✅ Created roles');

  // Create default admin user
  console.log('Creating default admin user...');
  const hashedPassword = await bcrypt.hash('admin123', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@sari.com' },
    update: {},
    create: {
      email: 'admin@sari.com',
      username: 'admin',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      roleId: adminRole.id,
      isActive: true
    }
  });

  console.log('✅ Created default admin user');
  console.log('📧 Admin Email: admin@sari.com');
  console.log('🔑 Admin Password: admin123');

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 