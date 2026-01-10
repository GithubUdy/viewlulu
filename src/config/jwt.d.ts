export interface JwtPayload {
    userId: number;
    email: string;
}
export declare const signJwt: (payload: JwtPayload) => string;
export declare const verifyJwt: (token: string) => JwtPayload;
//# sourceMappingURL=jwt.d.ts.map