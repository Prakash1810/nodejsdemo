const Users     = require('../db/users');
const UserTemp  = require('../db/user-temp');
const helpers   = require('../helpers/helper.functions');
const config    = require('config');
const jwt       = require('jsonwebtoken');

let user = {};

user.activate = (req, res) => {
    try {
        const userHash = JSON.parse(helpers.decrypt(req.params.hash));
        UserTemp.findById(userHash.id)
        .exec()
        .then(result => {
            if(result) {
                Users.create({
                    email: result.email,
                    password: result.password,
                    referral_code: result.referral_code,
                    created_date: result.created_date
                }, (err) => {
                    if (err) {
                        return res.status(500).send(helpers.errorFormat(err.message))
                    } else {
                        if(UserTemp.removeUserTemp(result.id)) {
                            return res.status(200).send(helpers.successFormat({
                                'message': `Congratulation!, Your account has been activated.`
                            }));
                        } else {
                            return res.status(400).json(helpers.errorFormat({'message': 'Invalid token. may be sdasdtoken as expired!'}));
                        }
                    }
                });
            } else {
                return res.status(400).json(helpers.errorFormat({'message': 'Invalid token. may be token as expired!'}));
            }            
        })
        .catch((err) => {
            return res.status(500).json(helpers.errorFormat({ 'message': err.message}));
        })
    }
    catch (err) {
        return res.status(500).json(helpers.errorFormat({'message': 'invalid token.'}));
    }
}

user.login = (req, res) => {
	Users.findOne({ email:req.body.email })
    .exec()
    .then(user => {
        if (!user.length) {
            return res.status(400).json(helpers.errorFormat({ 'message': 'Invalid credentials' }));
        } else {
            bcrypt.compare(req.body.password, user.password, function(err, result) {
                if (err) {
                    return res.status(400).json(helpers.errorFormat({ 'message': err.message }));
                }

                if (result) {
                    let expiry = config.get('secrete.exipiry')
                    let token = jwt.sign({ user: user._id }, config.get('secrete.key'), { expiresIn: expiry });
                    return res.status(200).json(helpers.successFormat({
                        "token": token,
                        "expiry": expiry,
                        "created_at": Date.now() 
                    }, user._id ));
                }
            });
        }

    })
    .catch(err => {
        return res.status(500).json({ "message":err.message });
    });
}

module.exports = user;
