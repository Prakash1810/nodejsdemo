const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const helpers   = require('../helpers/helper.functions');

const saltRounds = 10;

const userTempSchema = mongoose.Schema({
    email: String,
    password: String,
    referral_code: { type: String, default: null },
    created_date: { type: Date, default: Date.now },
    modified_date: { type: Date, default: null },
    is_deleted: { type: Boolean, default: false },
});

userTempSchema.pre('save', function(next) {
    const userTemp = this;

    // only hash the password if it has been modified (or is new)
    if (!userTemp.isModified('password')) return next();

    // generate a salt
    bcrypt.genSalt(saltRounds, (err, salt) => {
        if (err) return next(err);

        // hash the password using our new salt
        bcrypt.hash(userTemp.password, salt, (err, hash) => {
            if (err) return next(err);

            userTemp.password = hash;
            next();
        });
    });
});


const UserTemp = module.exports =  mongoose.model('user-temp', userTempSchema);

module.exports.removeUserTemp = async (id) => {
    return await UserTemp.deleteOne({ _id: id })
                .then(result => {
                    return true;
                })
                .catch(err => {
                    return false;
                });
};

module.exports.checkEmail = (email) => {
    try {
        return UserTemp.find({ email: email }).exec();
    } catch (error) {
        // handle query error
        // return res.status(500).send(error);
    }
};
