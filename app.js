const app        = require('./src/app/express.config');
const mongoose   = require('./src/app/db.config');

// mongodb connect
mongoose.connect();

app.listen(3000, () => {
    console.log('listening on port 3000!!')
});

module.exports = app;