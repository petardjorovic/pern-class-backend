import { Router, Request, Response } from 'express';
import {and, desc, eq, getTableColumns, ilike, or, sql} from "drizzle-orm";
import {user} from "../db/schema/index.js";
import {db} from "../db/index.js";

const usersRouter = Router();

usersRouter.get('/', async (req: Request, res: Response) => {
    try {
        const {search, role, page = 1, limit = 10} = req.query;

        const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
        const limitPerPage = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 10));

        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        // Helper to escape LIKE wildcards
        const escapeLike = (str: string) => str.replace(/[%_]/g, '\\$&');

        // If a search query exists, filter by user's name OR by user's email
        if(search){
            const escapedSearch = escapeLike(String(search));
            filterConditions.push(
                or(
                    ilike(user.name, `%${escapedSearch}%`),
                    ilike(user.email, `%${escapedSearch}%`)
                )
            )
        }

        // If role filter exists, match the exact role
        if(role){
            filterConditions.push(eq(user.role, role as any));
        }

        // combine all filters using AND if any exist
        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

        const countResult = await db
            .select({count: sql<string>`count(*)`})
            .from(user)
            .where(whereClause);

        const totalCount = parseInt(countResult[0]?.count ?? '0', 10);

        const usersList = await db
            .select({...getTableColumns(user)})
            .from(user)
            .where(whereClause)
            .orderBy(desc(user.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        res.status(200).json({
            data: usersList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage)
            }
        });

    } catch (e) {
        console.error(`GET /users error: ${e}`);
        res.status(500).json({error: 'Failed to get users'});
    }
})

export default usersRouter;