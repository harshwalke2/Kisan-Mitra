export async function up(knex: any): Promise<void> {
  // Government Schemes
  await knex.schema.createTable('government_schemes', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('title', 500).notNullable();
    table.text('description').notNullable();
    table.string('category', 100);
    table.jsonb('eligibility').defaultTo('[]');
    table.jsonb('benefits').defaultTo('[]');
    table.jsonb('documents').defaultTo('[]');
    table.text('application_process');
    table.date('deadline');
    table.string('state', 100).defaultTo('All India');
    table.enum('central_or_state', ['central', 'state']).defaultTo('central');
    table.string('official_link', 500);
    table.string('image_url', 500);
    table.boolean('is_active').defaultTo(true);
    table.uuid('created_by').references('id').inTable('users');
    table.timestamps(true, true);
    
    table.index('category');
    table.index('state');
    table.index('is_active');
    table.index('deadline');
  });

  await knex.schema.createTable('scheme_applications', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('scheme_id').references('id').inTable('government_schemes').onDelete('CASCADE');
    table.uuid('farmer_id').references('id').inTable('users').onDelete('CASCADE');
    table.enum('status', ['draft', 'submitted', 'under-review', 'approved', 'rejected']).defaultTo('draft');
    table.jsonb('documents').defaultTo('[]');
    table.text('remarks');
    table.timestamp('submitted_at');
    table.timestamps(true, true);
    
    table.index('scheme_id');
    table.index('farmer_id');
    table.index('status');
  });

  await knex.schema.createTable('scheme_bookmarks', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.uuid('scheme_id').references('id').inTable('government_schemes').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.unique(['user_id', 'scheme_id']);
  });

  // Notifications
  await knex.schema.createTable('notifications', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('title', 255).notNullable();
    table.text('message').notNullable();
    table.enum('type', ['info', 'warning', 'success', 'error', 'alert']).defaultTo('info');
    table.enum('category', ['farm', 'market', 'tools', 'chat', 'scheme', 'system']).defaultTo('system');
    table.boolean('is_read').defaultTo(false);
    table.timestamp('read_at');
    table.string('action_url', 500);
    table.timestamps(true, true);
    
    table.index('user_id');
    table.index('is_read');
    table.index('category');
    table.index('created_at');
  });

  // User Sessions for real-time tracking
  await knex.schema.createTable('user_sessions', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('socket_id', 255);
    table.string('ip_address', 45);
    table.string('user_agent', 500);
    table.boolean('is_online').defaultTo(false);
    table.timestamp('last_active').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index('user_id');
    table.index('is_online');
    table.index('socket_id');
  });
}

export async function down(knex: any): Promise<void> {
  await knex.schema.dropTableIfExists('user_sessions');
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('scheme_bookmarks');
  await knex.schema.dropTableIfExists('scheme_applications');
  await knex.schema.dropTableIfExists('government_schemes');
}
