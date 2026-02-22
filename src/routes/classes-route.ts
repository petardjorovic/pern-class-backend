import { Router, Request, Response } from 'express';
import {db} from "../db/index.js";
import {classes, departments, subjects, user} from "../db/schema/index.js";
import {and, desc, eq, getTableColumns, ilike, or, sql} from "drizzle-orm";

const classesRouter = Router();

classesRouter.get('/', async (req:Request, res:Response) => {
    try {
        const {search, subject, teacher, page = 1, limit = 10} = req.query;

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
                    ilike(classes.name, `%${escapedSearch}%`),
                    ilike(classes.inviteCode, `%${escapedSearch}%`)
                )
            )
        }

        // If a subject query exists, filter by subject name
        if(subject){
            const escapedSubject = escapeLike(String(subject));
            filterConditions.push(ilike(subjects.name, `%${escapedSubject}%`))
        }

        // If a subject query exists, filter by subject name
        if(teacher){
            const escapedTeacher = escapeLike(String(teacher));
            filterConditions.push(ilike(user.name, `%${escapedTeacher}%`))
        }

        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

        const countResult = await db
            .select({count: sql<string>`count(*)`})
            .from(classes)
            .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            .leftJoin(user, eq(classes.teacherId, user.id))
            .where(whereClause);

        const totalCount = parseInt(countResult[0]?.count ?? '0', 10);

        const classesList = await db
            .select({
                ...getTableColumns(classes),
                user: {...getTableColumns(user)},
                subject: {...getTableColumns(subjects)},
            })
            .from(classes)
            .leftJoin(user, eq(classes.teacherId, user.id))
            .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            .where(whereClause)
            .orderBy(desc(classes.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        res.status(200).json({
            data: classesList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage)
            }
        });
    } catch (e) {
        console.error(`GET /classes error: ${e}`);
        res.status(500).json({error: 'Failed to get classes'});
    }
})

classesRouter.get('/:id', async (req:Request, res:Response) => {
    const classId = Number(req.params.id);

    if(!Number.isFinite(classId)) return res.status(400).json({error: 'No Class found.'});

    const [classDetails] = await db
        .select({
            ...getTableColumns(classes),
            subject: {...getTableColumns(subjects)},
            department: {...getTableColumns(departments)},
            teacher: {...getTableColumns(user)},
        })
        .from(classes)
        .leftJoin(subjects, eq(classes.subjectId, subjects.id))
        .leftJoin(user, eq(classes.teacherId, user.id))
        .leftJoin(departments, eq(subjects.departmentId, departments.id))
        .where(eq(classes.id, classId))

    if(!classDetails) return res.status(404).json({error: 'Class not found'});

    return res.status(200).json({data: classDetails});
})

classesRouter.post('/', async (req:Request, res:Response) => {
    try {
        const { name, subjectId, teacherId, capacity, status, description, bannerUrl, bannerCldPubId } = req.body;

        const [createdClass] = await db
            .insert(classes)
            .values({...req.body, inviteCode: Math.random().toString(36).substring(2, 9), schedules: []})
            .returning({ id: classes.id })

        if(!createdClass) throw new Error('Failed to create class');

        return res.status(201).json({data: createdClass});
    } catch (e) {
        console.error(`POST /classes error: ${e}`);
        res.status(500).json({error: 'Failed to add class'});
    }
})

export default classesRouter;