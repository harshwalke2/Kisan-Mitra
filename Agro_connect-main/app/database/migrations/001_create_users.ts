export async function up(knex: any): Promise<void> {
  await knex.schema.createTable('users', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.string('email', 255).unique().notNullable();
    table.string('password', 255).notNullable();
    table.string('phone', 20);
    table.enum('role', ['farmer', 'admin']).defaultTo('farmer');
    
    // Farm details
    table.string('farm_name', 255);
    table.decimal('farm_size', 10, 2);
    table.string('farm_size_unit', 10).defaultTo('acres');
    table.jsonb('crops_grown').defaultTo('[]');
    table.string('soil_type', 50);
    
    // Location
    table.decimal('latitude', 10, 8);
    table.decimal('longitude', 11, 8);
    table.string('address', 500);
    table.string('state', 100);
    table.string('district', 100);
    table.string('pincode', 10);
    
    // Preferences
    table.string('preferred_language', 10).defaultTo('en');
    table.string('avatar_url', 500);
    
    // Status
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_verified').defaultTo(false);
    table.timestamp('last_login');
    
    // Timestamps
    table.timestamps(true, true);
    
    // Indexes
    table.index('email');
    table.index('role');
    table.index('state');
    table.index('created_at');
  });
}

export async function down(knex: any): Promise<void> {
  await knex.schema.dropTableIfExists('users');
}
