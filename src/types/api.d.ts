type User = {
    id: `u_${string}`;
    username: string;
}

type UserSession = {
    access_token: string;
    expires_at: number;
    user: User
};