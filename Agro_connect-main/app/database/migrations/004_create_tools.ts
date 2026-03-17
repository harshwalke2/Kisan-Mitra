export async function up(knex: any): Promise<void> {
  await knex.schema.createTable('tools', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('owner_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.string('category', 100).notNullable();
    table.text('description');
    table.jsonb('images').defaultTo('[]');
    table.decimal('daily_rate', 10, 2).notNullable();
    table.decimal('weekly_rate', 10, 2);
    table.decimal('monthly_rate', 10, 2);
    table.decimal('security_deposit', 10, 2).defaultTo(0);
    table.string('location', 255);
    table.enum('condition', ['new', 'excellent', 'good', 'fair']).defaultTo('good');
    table.jsonb('availability').defaultTo('[]');
    table.jsonb('specifications').defaultTo('{}');
    table.decimal('rating', 2, 1).defaultTo(0);
    table.integer('review_count').defaultTo(0);
    table.enum('status', ['available', 'booked', 'unavailable']).defaultTo('available');
    table.timestamps(true, true);
    
    table.index('owner_id');
    table.index('category');
    table.index('location');
    table.index('status');
  });

  await knex.schema.createTable('tool_bookings', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tool_id').references('id').inTable('tools').onDelete('CASCADE');
    table.uuid('borrower_id').references('id').inTable('users').onDelete('CASCADE');
    table.uuid('lender_id').references('id').inTable('users').onDelete('CASCADE');
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.decimal('total_amount', 10, 2).notNullable();
    table.decimal('security_deposit', 10, 2).defaultTo(0);
    table.enum('status', ['pending', 'approved', 'rejected', 'active', 'completed', 'cancelled']).defaultTo('pending');
    table.text('remarks');
    table.timestamps(true, true);
    
    table.index('tool_id');
    table.index('borrower_id');
    table.index('lender_id');
    table.index('status');
  });

  await knex.schema.createTable('land_listings', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('owner_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('title', 255).notNullable();
    table.text('description');
    table.jsonb('images').defaultTo('[]');
    table.decimal('size', 10, 2).notNullable();
    table.string('size_unit', 20).defaultTo('acres');
    table.string('soil_type', 50);
    table.string('location', 255);
    table.decimal('monthly_rent', 10, 2).notNullable();
    table.integer('min_lease_period').defaultTo(6);
    table.integer('max_lease_period').defaultTo(36);
    table.jsonb('facilities').defaultTo('[]');
    table.string('water_source', 100);
    table.boolean('is_fenced').defaultTo(false);
    table.jsonb('availability').defaultTo('[]');
    table.decimal('rating', 2, 1).defaultTo(0);
    table.enum('status', ['available', 'booked', 'unavailable']).defaultTo('available');
    table.timestamps(true, true);
    
    table.index('owner_id');
    table.index('location');
    table.index('status');
  });

  await knex.schema.createTable('tool_reviews', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tool_id').references('id').inTable('tools').onDelete('CASCADE');
    table.uuid('booking_id').references('id').inTable('tool_bookings').onDelete('CASCADE');
    table.uuid('reviewer_id').references('id').inTable('users').onDelete('CASCADE');
    table.integer('rating').notNullable();
    table.text('comment');
    table.timestamps(true, true);
    
    table.index('tool_id');
    table.index('reviewer_id');
  });
}

export async function down(knex: any): Promise<void> {
  await knex.schema.dropTableIfExists('tool_reviews');
  await knex.schema.dropTableIfExists('land_listings');
  await knex.schema.dropTableIfExists('tool_bookings');
  await knex.schema.dropTableIfExists('tools');
}
