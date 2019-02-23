const UserTemp      = require('../db/user-temp');
const Users         = require('../db/users');

class Controller {
    errorMsgFormat (error) {
        return { 
            "code": 400,
            "errors": true,
            "data": { 
                "type": "users",
                "attributes": error
            }
        };
    }

    errorFormat (error) {
        let errors = {};
        if (error.details) {
            error.details.forEach((detail) => {
                errors[detail.path] = detail.message;
            });
        } else {
            errors = error;
        }
        return this.errorMsgFormat(errors);
    }

    successFormat ( res, id = false ) {
        return { 
            "code": 200,
            "errors": false,
            "data": {
                "id": id,
                "type": "users",
                "attributes": res
            }
        }; 
    }

    // checkEmailisUnique (email) {
    //     // check email address already exits in user temp collections
    //     UserTemp.find({ email: email })
    //     .exec()
    //     .then(result => {
    //          if (result.length) {
    //             return false;
    //          } else {
    //             Users.find({email: email})
    //             .exec()
    //             .then(result => {
    //                 if (result.length) {
    //                     return false;
    //                 } else {
    //                     return true;
    //                 }
    //             });
    //          }
    //     });
    // }
     
}

module.exports = Controller;