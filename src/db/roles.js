const mongoose = require('mongoose');

const rolesSchema = mongoose.Schema({
    role_name: String,
    created_date: { type: Date, default: Date },
    modified_date: Date
});

Roles = mongoose.model('roles', rolesSchema); 
module.exports = Roles;