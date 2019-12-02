const uuid = require('uuid/v4');



class Generate{
    generateUuid() {
        return uuid();
    }
    
}
module.exports =Generate;