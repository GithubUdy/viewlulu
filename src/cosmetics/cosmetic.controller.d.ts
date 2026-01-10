import { Response } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
/**
 * POST /cosmetics
 * 화장품 사진 업로드
 */
export declare const uploadCosmetic: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * GET /cosmetics/me
 * 내 화장품 목록 조회
 */
export declare const getMyCosmeticsHandler: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=cosmetic.controller.d.ts.map