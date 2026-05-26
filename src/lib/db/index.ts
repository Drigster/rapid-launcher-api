import { Kysely, type RawBuilder, sql, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { DB } from "./schema";

const dialect = new PostgresDialect({
	pool: new Pool({
		connectionString: process.env.DATABASE_URL,
		max: 10,
	}),
});

export function init_db() {
	return new Kysely<DB>({
		dialect,
	});
}

export function json<T>(obj: T): RawBuilder<T> {
	return sql`${JSON.stringify(obj)}`;
}
