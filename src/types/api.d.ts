type User = {
	id: `u_${string}`;
	username: string;
	email: string;
	verified: boolean;
};

type UserSession = {
	access_token: string;
	expires_at: number;
	user: User | null;
};
