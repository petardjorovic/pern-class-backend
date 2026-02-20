import { Router, Request, Response } from 'express';
import {db} from "../db/index.js";
import {classes} from "../db/schema/index.js";

const classesRouter = Router();

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