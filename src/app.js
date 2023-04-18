import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from "mongodb";
import dayjs from "dayjs"
//import dotenv from "dotenv";
import joi from "joi";

const app = express();
app.use(cors());
app.use(express.json());
//dotenv.config();


// Conexão com o banco de dados 

const mongoClient = new MongoClient("mongodb://localhost:27017/batePapoUol")
try {
    await mongoClient.connect()
    console.log('MongoDB conectado!')
} catch (err) {
    console.log(err.message)
}

const db = mongoClient.db()


//Validações
const participantSchema = joi.object({ name: joi.string().required() })

const messageSchema = joi.object({
    from: joi.string().required(),
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().required().valid("message", "private_message")
}) 
 
// endpoints

app.post("/participants", async (req, res) => {
  const name = req.body.name;
  const validation = participantSchema.validate(req.body)
  
  if (validation.error) {
      return res.sendStatus(422)
  }

  try {
      const nomeEmUso  = await db.collection("participants").findOne({ name })
      if (nomeEmUso) return res.sendStatus(409)

      const lastStatus = Date.now()
      await db.collection("participants").insertOne({ name, lastStatus: lastStatus })

      const message = {    
          from: name,
          to: 'Todos',
          text: 'entra na sala...',
          type: 'status',
          time: dayjs(lastStatus).format("HH:mm:ss")
      }

      await db.collection("messages").insertOne(message)
      res.sendStatus(201)

  } catch (err) {
      res.status(500).send(err.message)
  }
})




app.listen(5000, () => console.log("Servidor rodando"))