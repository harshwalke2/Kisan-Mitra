export async function up(knex: any): Promise<void> {
  await knex.schema.createTable('crop_health_records', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('crop_name', 100).notNullable();
    table.integer('health_score').defaultTo(100);
    table.enum('status', ['healthy', 'at-risk', 'diseased', 'unknown']).defaultTo('healthy');
    table.jsonb('issues').defaultTo('[]');
    table.jsonb('recommendations').defaultTo('[]');
    table.string('image_url', 500);
    table.text('ai_analysis_result');
    table.timestamp('last_checked').defaultTo(knex.fn.now());
    table.timestamps(true, true);
    
    table.index('user_id');
    table.index('crop_name');
    table.index('status');
  });

  await knex.schema.createTable('farm_alerts', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.enum('type', ['fire', 'theft', 'disease', 'weather', 'pest']).notNullable();
    table.enum('severity', ['low', 'medium', 'high', 'critical']).notNullable();
    table.text('message').notNullable();
    table.string('location', 255);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('resolved_at');
    table.timestamps(true, true);
    
    table.index('user_id');
    table.index('type');
    table.index('is_active');
  });

  await knex.schema.createTable('weather_data', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.decimal('temperature', 5, 2);
    table.integer('humidity');
    table.decimal('rainfall', 5, 2);
    table.decimal('wind_speed', 5, 2);
    table.jsonb('forecast').defaultTo('[]');
    table.string('location', 255);
    table.timestamp('recorded_at').defaultTo(knex.fn.now());
    
    table.index('user_id');
    table.index('recorded_at');
  });

  await knex.schema.createTable('soil_data', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.decimal('ph', 3, 1);
    table.decimal('nitrogen', 6, 2);
    table.decimal('phosphorus', 6, 2);
    table.decimal('potassium', 6, 2);
    table.decimal('moisture', 5, 2);
    table.string('texture', 50);
    table.timestamp('tested_at').defaultTo(knex.fn.now());
    
    table.index('user_id');
  });
}

export async function down(knex: any): Promise<void> {
  await knex.schema.dropTableIfExists('soil_data');
  await knex.schema.dropTableIfExists('weather_data');
  await knex.schema.dropTableIfExists('farm_alerts');
  await knex.schema.dropTableIfExists('crop_health_records');
}
