import express from 'express';

import indexRouter from './routes';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/', indexRouter);

const port = process.PORT || 5000;

app.listen(port, () => {
  console.log('server running.');
});
