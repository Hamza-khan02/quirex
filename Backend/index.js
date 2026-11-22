import "dotenv/config";
import express from 'express';
import {dbConnect} from './config/db.js';
import router from './route/userRoute.js';
import adminRoute from './route/adminRoute.js'
import fileUpload from 'express-fileupload';
import cors from 'cors'
const app=express();
const PORT=process.env.PORT || 9000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(express.json());
app.use(fileUpload());
app.use(cors({ origin: CLIENT_URL }));
app.use('/img',express.static('uploads'));
app.use('/api',router);
app.use('/api',adminRoute);

const startServer = async () => {
  try {
    await dbConnect();
    app.listen(PORT,()=>{
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error.message);
    process.exit(1);
  }
};

startServer();
