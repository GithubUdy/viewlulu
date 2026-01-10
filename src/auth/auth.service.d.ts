export declare class AuthService {
    static register(email: string, password: string, name: string): Promise<any>;
    static login(email: string, password: string): Promise<{
        token: string;
        user: {
            id: any;
            email: any;
            name: any;
        };
    }>;
}
//# sourceMappingURL=auth.service.d.ts.map