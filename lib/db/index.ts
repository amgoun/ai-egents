import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Needed for Supabase
  },
});

export const db = drizzle(pool, { schema });




// import { drizzle } from 'drizzle-orm/node-postgres';
// import { Pool } from 'pg';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: {
//     rejectUnauthorized: false, // Needed for Supabase
//   },
// });

// const db = drizzle(pool);


