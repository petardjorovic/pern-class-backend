import express from 'express';
import subjectsRouter from "./routes/subjects-route";
import cors from "cors";

const app = express();
const port = 8000;

app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}))

app.use(express.json());

app.use('/api/subjects', subjectsRouter)

app.get('/', (req, res) => {
  res.send('Hello from Express server!');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
