export async function up(knex: any): Promise<void> {
  await knex.schema.createTable('crop_prices', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('crop_name', 100).notNullable();
    table.string('variety', 100);
    table.decimal('current_price', 10, 2).notNullable();
    table.string('price_unit', 20).defaultTo('per quintal');
    table.decimal('price_change', 10, 2).defaultTo(0);
    table.decimal('price_change_percent', 5, 2).defaultTo(0);
    table.enum('demand', ['high', 'medium', 'low']).defaultTo('medium');
    table.enum('supply', ['high', 'medium', 'low']).defaultTo('medium');
    table.enum('trend', ['up', 'down', 'stable']).defaultTo('stable');
    table.jsonb('price_history').defaultTo('[]');
    table.jsonb('price_prediction').defaultTo('[]');
    table.string('market_location', 255);
    table.date('price_date').defaultTo(knex.fn.now());
    table.timestamps(true, true);
    
    table.index('crop_name');
    table.index('market_location');
    table.index('price_date');
  });

  await knex.schema.createTable('crop_listings', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('farmer_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('crop_name', 100).notNullable();
    table.string('variety', 100);
    table.decimal('quantity', 10, 2).notNullable();
    table.string('quantity_unit', 20).defaultTo('quintals');
    table.decimal('price_per_unit', 10, 2).notNullable();
    table.decimal('min_order_quantity', 10, 2).defaultTo(1);
    table.string('quality', 50);
    table.boolean('is_organic').defaultTo(false);
    table.date('harvest_date');
    table.date('expiry_date');
    table.jsonb('images').defaultTo('[]');
    table.text('description');
    table.string('location', 255);
    table.decimal('latitude', 10, 8);
    table.decimal('longitude', 11, 8);
    table.enum('status', ['active', 'sold', 'expired']).defaultTo('active');
    table.timestamps(true, true);
    
    table.index('farmer_id');
    table.index('crop_name');
    table.index('status');
    table.index('location');
  });

  await knex.schema.createTable('market_insights', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('title', 255).notNullable();
    table.text('description').notNullable();
    table.string('category', 100);
    table.enum('impact', ['high', 'medium', 'low']).defaultTo('medium');
    table.string('state', 100);
    table.timestamps(true, true);
    
    table.index('category');
    table.index('state');
  });

  await knex.schema.createTable('wishlists', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.uuid('listing_id').references('id').inTable('crop_listings').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.unique(['user_id', 'listing_id']);
    table.index('user_id');
  });
}

export async function down(knex: any): Promise<void> {
  await knex.schema.dropTableIfExists('wishlists');
  await knex.schema.dropTableIfExists('market_insights');
  await knex.schema.dropTableIfExists('crop_listings');
  await knex.schema.dropTableIfExists('crop_prices');
}
