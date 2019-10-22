const app        = require('./src/app/express.config');
const mongoose = require('./src/app/db.config');
const compression = require('compression');


// mongodb connect

mongoose.connect();

app.use(compression());






app.listen(3000, () => {
    console.log('listening on port 3000!!')
});

// logger
//require('./src/app/logger');

module.exports = app;
