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
    
}

module.exports = Controller;