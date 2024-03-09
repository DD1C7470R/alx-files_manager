import express from 'express';
import AppController from '../controllers/AppController';
import AuthController from '../controllers/AuthController';
import UsersController from '../controllers/UsersController';
import FilesController from '../controllers/FilesController';
import { verifyUser } from '../utils/authUtil';

const indexRouter = express.Router();

indexRouter.get('/', (req, res) => {
  res.end('Hello you');
});

indexRouter.get('/status', AppController.getStatus);
indexRouter.get('/stats', AppController.getStats);

indexRouter.post('/users', UsersController.postNew);
indexRouter.get('/users/me', verifyUser, UsersController.getMe);

indexRouter.get('/connect', AuthController.getConnect);
indexRouter.get('/disconnect', AuthController.getDisconnect);

indexRouter.get('/files/?', verifyUser, FilesController.getIndex);
indexRouter.post('/files', verifyUser, FilesController.postUpload);
indexRouter.get('/files/:id', verifyUser, FilesController.getShow);
indexRouter.put('/files/:id/publish', verifyUser, FilesController.putPublish);
indexRouter.put('/files/:id/unpublish', verifyUser, FilesController.putUntPublish);

export default indexRouter;
