import {Router} from 'express';
import {and, desc, eq, getTableColumns, ilike, or, sql} from "drizzle-orm";
import {departments, subjects} from "../db/schema";
import { db } from "../db"

const subjectsRouter = Router();

// Get all subjects with optional search, filtering and pagination
subjectsRouter.get('/', async (req, res) => {
    try {
        const {search, department, page = 1, limit = 10} = req.query;

        const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
        const limitPerPage = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 10));

        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        // Helper to escape LIKE wildcards
        const escapeLike = (str: string) => str.replace(/[%_]/g, '\\$&');

        // If a search query exists, filter by subject name OR by subject code
        if(search){
            const escapedSearch = escapeLike(String(search));
            filterConditions.push(
                or(
                    ilike(subjects.name, `%${escapedSearch}%`),
                    ilike(subjects.code, `%${escapedSearch}%`)
                )
            )
        }

        // If a department query exists, filter by department name OR by department code
        if(department){
            const escapedDepartment = escapeLike(String(department));
            filterConditions.push(or(
                ilike(departments.name, `%${escapedDepartment}%`),
                ilike(departments.code, `%${escapedDepartment}%`),
            ))
        }

        // combine all filters using AND if any exist
        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

        const countResult = await db
            .select({count: sql<string>`count(*)`})
            .from(subjects)
            .leftJoin(departments, eq(subjects.departmentId, departments.id))
            .where(whereClause);

        const totalCount = parseInt(countResult[0]?.count ?? '0', 10);

        const subjectsList = await db
            .select({
                ...getTableColumns(subjects),
                department: {...getTableColumns(departments)}
            })
            .from(subjects)
            .leftJoin(departments, eq(subjects.departmentId, departments.id))
            .where(whereClause)
            .orderBy(desc(subjects.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        res.status(200).json({
            data: subjectsList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage)
            }
        });

    } catch (e) {
        console.error(`GET /subjects error: ${e}`);
        res.status(500).json({error: 'Failed to get subjects'});
    }
})

export default subjectsRouter;