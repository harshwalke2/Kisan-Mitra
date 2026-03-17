export async function up(knex: any): Promise<void> {
  await knex.schema.createTable('chats', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.enum('type', ['direct', 'group']).defaultTo('direct');
    table.string('name', 255);
    table.string('avatar_url', 500);
    table.uuid('created_by').references('id').inTable('users');
    table.timestamps(true, true);
    
    table.index('type');
    table.index('created_by');
  });

  await knex.schema.createTable('chat_participants', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('chat_id').references('id').inTable('chats').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.enum('role', ['admin', 'member']).defaultTo('member');
    table.timestamp('joined_at').defaultTo(knex.fn.now());
    table.timestamp('last_read_at');
    table.boolean('is_active').defaultTo(true);
    
    table.unique(['chat_id', 'user_id']);
    table.index('chat_id');
    table.index('user_id');
  });

  await knex.schema.createTable('messages', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('chat_id').references('id').inTable('chats').onDelete('CASCADE');
    table.uuid('sender_id').references('id').inTable('users').onDelete('CASCADE');
    table.text('content').notNullable();
    table.enum('type', ['text', 'image', 'video', 'file']).defaultTo('text');
    table.string('media_url', 500);
    table.boolean('is_read').defaultTo(false);
    table.timestamp('read_at');
    table.timestamps(true, true);
    
    table.index('chat_id');
    table.index('sender_id');
    table.index('is_read');
    table.index('created_at');
  });

  await knex.schema.createTable('friends', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.uuid('friend_id').references('id').inTable('users').onDelete('CASCADE');
    table.enum('status', ['pending', 'accepted', 'blocked']).defaultTo('pending');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.unique(['user_id', 'friend_id']);
    table.index('user_id');
    table.index('friend_id');
  });
}

export async function down(knex: any): Promise<void> {
  await knex.schema.dropTableIfExists('friends');
  await knex.schema.dropTableIfExists('messages');
  await knex.schema.dropTableIfExists('chat_participants');
  await knex.schema.dropTableIfExists('chats');
}
