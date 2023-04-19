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
    from: joi.string(),
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().required().valid("message", "private_message")
}) 
 
// endpoints

app.post("/participants", async (req, res) => {
  const nome = req.body.name;
  const validation = participantSchema.validate(req.body)
  
  if (validation.error) {
      return res.sendStatus(422)
  }

  try {
      const nomeEmUso  = await db.collection("participants").findOne({ nome })
      if (nomeEmUso) return res.sendStatus(409)

      const lastStatus = Date.now()
      await db.collection("participants").insertOne({ nome, lastStatus: lastStatus })

      const message = {    
          from: nome,
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

app.get("/participants", async (req, res) => {
  try{
    const participants = await db.collection("participants").find().toArray();
    res.send(participants)
  }
  catch(err){
    res.status(500).send(err.message)
  }
})

app.post("/messages", async (req, res) => {

  const messagens = db.collection('messages');
  const participantes = db.collection('participants');

  try {
      const { to, text, type } = req.body;
      const { user } = req.headers
      

      const { error } = messageSchema.validate({ to, text, type });

      if (error) {
          return res.status(422).send(error.details[0].message);
      }

      const participanteExiste = await participantes.findOne({
          name: user
      });

      if (!participanteExiste) {
          return res.status(422).send("Remetente não encontrado");
      }

      const time = dayjs().format("HH:mm:ss");
      const message = {
          from: user,
          to,
          text,
          type,
          time,
      }

      await messagens.insertOne(message)
      return res.status(201).send();

  } catch (err) {
      console.log(err);
      return res.status(500).send('Internal server error');
  }
})




app.listen(5000, () => console.log("Servidor rodando"))