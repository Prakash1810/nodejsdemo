const mongoose = require('mongoose');

const apiKeys = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    is_deleted : { type: Boolean,default: false},
    apikey : { type: String,required: true},
    secretkey :{ type : String,required: true},
    date : {type: Date ,default: Date.now},
    modified_date : {type: Date}
                           
});

module.exports = mongoose.model('api-key',apiKeys);