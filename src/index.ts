import express from 'express';
import cors from "cors";
import {toNodeHandler} from "better-auth/node";
import subjectsRouter from "./routes/subjects-route";
import securityMiddleware from "./middleware/security";
import {auth} from "./lib/auth";

const app = express();
const port = 8000;

if(!process.env.FRONTEND_URL)
  throw new Error("FRONTEND_URL is not set in .env file.")

app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}))

app.all('/api/auth/*splat', toNodeHandler(auth));

app.use(express.json());
app.use(securityMiddleware)

app.use('/api/subjects', subjectsRouter);

app.get('/', (req, res) => {
  res.send('Hello from Express server!');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
