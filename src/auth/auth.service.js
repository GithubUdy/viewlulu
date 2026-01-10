"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jwt_1 = require("../config/jwt");
const user_repository_1 = require("../users/user.repository");
class AuthService {
    static async register(email, password, name) {
        const existingUser = await (0, user_repository_1.findUserByEmail)(email);
        if (existingUser) {
            throw new Error('EMAIL_EXISTS');
        }
        const password_hash = await bcrypt_1.default.hash(password, 10);
        const user = await (0, user_repository_1.createUser)({
            email,
            password_hash,
            name,
        });
        return user;
    }
    static async login(email, password) {
        const user = await (0, user_repository_1.findUserByEmail)(email);
        if (!user) {
            throw new Error('INVALID_CREDENTIALS');
        }
        const isMatch = await bcrypt_1.default.compare(password, user.password_hash);
        if (!isMatch) {
            throw new Error('INVALID_CREDENTIALS');
        }
        const token = (0, jwt_1.signJwt)({
            userId: user.id,
            email: user.email,
        });
        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
        };
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map