import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type News = {
    /**
     * @kyselyType(`n_${string}`)
     */
    id: `n_${string}`;
    title: string;
    body: string;
    image: string;
    redirect_url: string;
};
export type Server = {
    /**
     * @kyselyType(`s_${string}`)
     */
    id: `s_${string}`;
    name: string;
    color_code: string;
    image_url: string | null;
    callback_url: string;
};
export type Session = {
    id: string;
    expires_at: number;
    /**
     * @kyselyType(`u_${string}`)
     */
    user_id: `u_${string}`;
};
export type User = {
    /**
     * @kyselyType(`u_${string}`)
     */
    id: `u_${string}`;
    username: string;
    email: string;
    password: string;
    server_id: string | null;
    verified_at: Timestamp | null;
    pending_email: string | null;
    email_verify_hash: string | null;
    email_verify_expires_at: Timestamp | null;
    newsletter: Generated<boolean>;
};
export type DB = {
    News: News;
    Server: Server;
    Session: Session;
    User: User;
};
