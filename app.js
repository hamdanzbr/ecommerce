// app.js
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const hbs = require('express-handlebars');
const fileUpload = require('express-fileupload');
const userRouter = require('./routes/user');
const adminRouter = require('./routes/admin');
const nocache = require('nocache'); // Import nocache middleware
const session = require('express-session');
const MongoStore = require('connect-mongo'); // For storing sessions in MongoDB
const bodyParser = require('body-parser');
const createError = require('http-errors'); // Import createError
const app = express();
const dateHelpers = require('./helpers/dateHelpers')

// Set up body-parser middleware to parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));
// Set the current working directory
process.env.PWD = process.cwd();

// Serve static files from the 'public/product-images' directory
app.use('/product-images', express.static(path.join(process.env.PWD, 'public/product-images')));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.engine(
  'hbs',
  hbs.engine({
    extname: 'hbs',
    defaultLayout: 'layout',
    layoutsDir: __dirname + '/views/layout/',
    partialsDir: __dirname + '/views/partials/',
    helpers: {
      unlessCond: function (v1, operator, v2, options) {
        switch (operator) {
          case '==':
            return v1 == v2 ? options.inverse(this) : options.fn(this);
          case '===':
            return v1 === v2 ? options.inverse(this) : options.fn(this);
          case '!=':
            return v1 != v2 ? options.inverse(this) : options.fn(this);
          case '!==':
            return v1 !== v2 ? options.inverse(this) : options.fn(this);
          case '<':
            return v1 < v2 ? options.inverse(this) : options.fn(this);
          case '<=':
            return v1 <= v2 ? options.inverse(this) : options.fn(this);
          case '>':
            return v1 > v2 ? options.fn(this) : options.inverse(this);
          case '>=':
            return v1 >= v2 ? options.fn(this) : options.inverse(this);
          case '&&':
            return v1 && v2 ? options.fn(this) : options.inverse(this);
          case '||':
            return v1 || v2 ? options.fn(this) : options.inverse(this);
          default:
            return options.inverse(this);
        }
      },
      eq: (a, b) => a === b,
      formatDate: dateHelpers.formatDate, // Register the formatDate helper
    formatDateWithDayAndTime: dateHelpers.formatDateWithDayAndTime, // Register the formatDateWithDayAndTime helper
    increment: (index) => index + 1 // Add this line to define the increment helper
    },
  })
);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());

// Initialize express-session with MongoStore
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 600000 }, // Adjust cookie settings as needed
  store: MongoStore.create({
    mongoUrl: process.env.DATABASE,
    dbName: process.env.DB_NAME,
    collection: 'sessions'
  })
}));

// Prevent caching on all routes
app.use(nocache());

const db = require('./config/connection');

// Connect to the database
db.connect()
  .then(() => {
    console.log('Database Connected');
  })
  .catch((err) => {
    console.error('Connection Error:', err);
  });

app.use('/', userRouter);
app.use('/admin', adminRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;