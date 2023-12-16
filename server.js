const express = require('express');
const path = require('path'); 
const {initializeApp} = require("firebase/app");
const {getAnalytics} = require("firebase/analytics");
const bodyParser = require('body-parser');
const cors = require('cors');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendEmailVerification } = require("firebase/auth");
const axios = require('axios');

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://karinelias2003:<password>@cluster0.xbw4s17.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
});

async function run() {
    try {
      await client.connect();
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
      await client.close();
    }
}
run().catch(console.dir);

const firebaseConfig = {
  apiKey: "AIzaSyAUTCzfVDD64Q4v3JlORG-r6vE63u3CPyk",
  authDomain: "experienciaux-f43c9.firebaseapp.com",
  projectId: "experienciaux-f43c9",
  storageBucket: "experienciaux-f43c9.appspot.com",
  messagingSenderId: "774268961147",
  appId: "1:774268961147:web:df7eb3c72ca365a1c4fdde",
  measurementId: "G-8BZG8Q5NS0"
};

const servidor = express();
var urlEncodeParser = bodyParser.urlencoded({extended:true});

let port = 3001;

const firebaseApp = initializeApp(firebaseConfig);
const analytics = getAnalytics(firebaseApp);
servidor.use(urlEncodeParser);
servidor.use(cors());

servidor.listen(port, ()=>{
    console.log('Servidor ejecutandose correctamente en el puerto: ', port);
});

servidor.post("/createUser",  (req, res) => {
  const auth = getAuth(firebaseApp);
  const email = req.body.email;
  const password = req.body.password;
  createUserWithEmailAndPassword(auth, email, password)
    .then((resp) => {
        res.status(200).send({
        msg: "Usuario creado exitosamente",
        data: resp,
      });
      sendEmailVerification(auth.currentUser).then(()=>{
        console.log('Se envio el correo de verificacion');
      });
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      res.status(500).send({
        msg: "Error al crear el usuario",
        errorCode: errorCode,
        errorMsg: errorMessage,
      }); 
  });
})

servidor.post("/logIn", async (req, res) => {
  try {
    const auth = getAuth(firebaseApp);
    const email = req.body.email;
    const password = req.body.password;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Usuario autenticado correctamente:", userCredential.user.uid);
      
      res.status(200).send({
        msg: "Sesion iniciada",
        data: userCredential,
      });
    } catch (authError) {
      console.error("Error de autenticación:", authError);
      res.status(401).send({
        msg: "Credenciales incorrectas",
        errorCode: authError.code,
        errorMsg: authError.message,
      });
    }
  } catch (error) {
    console.error("Error al procesar la solicitud:", error);
    res.status(500).send({
      msg: "Error interno del servidor",
      error: error.toString(),
    });
  }
});

servidor.post("/logOut",  (res) => {
  const auth = getAuth(firebaseApp);
  signOut(auth).then(() => {
    console.log('Se cerro bien la sesion');
  }).catch((error) => {
    console.log('Hubo un error');
  });
});


servidor.post('/createPost', async (req, res)=>{
  try {
      const client = new MongoClient(uri);
      const mainDB = client.db("mainExamenDB");
      const Post = mainDB.collection("Posts");
      const doc = req.body;
      const result = await Post.insertOne(doc);
      console.log(
        `Se inserto un documento con el _id: ${result.insertedId}`,
      );
      res.status(200).send("El Post se creo exitosamente")
  } catch(error){
      res.status(500).send("No se creo el Post, algo salio mal")
  }finally {
      await client.close();
  }
  
})

servidor.get('/listPost', async (req, res)=>{
  try {
      const client = new MongoClient(uri);
      const mainDB = client.db("mainExamenDB");
      const Post = mainDB.collection("Posts");
      const query = {};
      const options = {
          sort: { Titulo: 1 },
      };
      const cursor = Post.find(query, options);
      if ((await Post.countDocuments(query)) === 0) {
          res.status(500).send("No se encontraron Posts")
      }else{
          let arr = []
          for await (const doc of cursor) {
              console.dir(doc);
              arr.push(doc)
          }
          res.status(200).send({
              documentos: arr,
          });
      }
      
  } catch(error){
      res.status(500).send("Algo salio mal")
      console.log(error);
  }finally {
      await client.close();
  } 
  run().catch(console.dir);
})

servidor.put('/editPost/:id', async (req, res)=>{
  try {
      const client = new MongoClient(uri);
      const mainDB = client.db("mainExamenDB");
      const Post = mainDB.collection("Posts");
      const filter = {id:req.params.id};
      const options = { upsert: true };
      const updateDoc = {
          $set: {
          ...req.body,
        },
      };
      const result = await Post.updateOne(filter, updateDoc, options);
      console.log(
        `${result.matchedCount} documento caracteristicas establecidas, se actualizaron ${result.modifiedCount} documento(s)`,
     );
      res.status(200).send("El post se actualizo correctamente")
  } catch(error){
      res.status(500).send("Algo salio mal, no se pudo actualizar el post")
      console.log(error);
  }finally {
      await client.close();
  } 
  run().catch(console.dir);
})

servidor.delete('/deletePost/:id', async (req, res)=>{
  try {
      const client = new MongoClient(uri);
      const mainDB = client.db("mainExamenDB");
      const Post = mainDB.collection("Posts");
      const query = {id:req.params.id};
      const result = await Post.deleteOne(query);
      if (result.deletedCount === 1) {
          console.log("Se borro el Post correctamente");
          res.status(200).send("Se borro el Post correctamente")
      } else {
          console.log("Ningun Post concuerda con la informacion brindada, no se borro ninguno");
      }
  } catch(error){
      res.status(500).send("Algo salio mal, no se pudo borrar el post")
      console.log(error);
  }finally {
      await client.close();
  } 
  run().catch(console.dir);
})