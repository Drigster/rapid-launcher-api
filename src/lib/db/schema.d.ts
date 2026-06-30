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
    image_url: string;
    is_featured: boolean;
    featured_button_text: string | null;
    featured_button_url: string | null;
    /**
     * @kyselyType(Timestamp)
     */
    created_at: Timestamp;
    redirect_url: string;
};
export type Notification = {
    /**
     * @kyselyType(`nt_${string}`)
     */
    id: `nt_${string}`;
    title: string;
    body: string;
    /**
     * @kyselyType(Timestamp)
     */
    created_at: Timestamp;
    hidden: Generated<boolean>;
};
export type Server = {
    /**
     * @kyselyType(`s_${string}`)
     */
    id: `s_${string}`;
    key: string;
    name: string;
    color_code: string;
    image_url: string | null;
    monitoring_image_url: string | null;
    colored_comment: string | null;
    comment: string | null;
    callback_url: string;
    ip: string;
    port: number;
    order: number;
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
    Notification: Notification;
    Server: Server;
    Session: Session;
    User: User;
};
