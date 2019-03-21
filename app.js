const app        = require('./src/app/express.config');
const mongoose   = require('./src/app/db.config');
const swagger    = require('./docs');

// mongodb connect
mongoose.connect();

// swagger api documentation
app.use('/doc', swagger);

app.listen(3000, () => {
    console.log('listening on port 3000!!')
});

module.exports = app;