'use strict';

const { expect }    = require('chai');
const password      = require('../../src/core/password');
var isValidRequest  = { 'id': '5c7e662bba7fe90ebe523256' , 'old_password' : '1234567S', 'password' : '1234567S', 'password_confirmation' : '1234567S' };

describe('change password module unit test :-', () => {
    it ('Should validate all the fields', (done) => {
        var errors    = {};
       
        let { error } = password.changePasswordValidate({});
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });

        expect(error.isJoi).to.equal(true);
        expect(error.name).to.equal('ValidationError');
        expect(errors.id).to.equal("\"id\" is required");
        expect(errors.old_password).to.equal("\"old_password\" is required");
        expect(errors.password).to.equal("\"password\" is required");
        expect(errors.password_confirmation).to.equal("\"password confirmation\" is required");

        done()
    });

    it ('Should enter all the fields', (done) => {
        let { error } = password.changePasswordValidate(isValidRequest);
        expect(error).to.equal(null);
        done()
    });

       it ('should check password minimum length', (done) => {
        var errors    = {};
        isValidRequest.password = '123456';
        let { error } = password.changePasswordValidate(isValidRequest);
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });

        expect(error.isJoi).to.equal(true);
        expect(error.name).to.equal('ValidationError');
        expect(errors.password).to.equal("password must be at least 8 characters with uppercase letters and numbers.");
        done()
    });

    it ('should check password strength', (done) => {
        var errors    = {};
        isValidRequest.password = '12345678';
        let { error } = password.changePasswordValidate(isValidRequest);
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });

        expect(error.isJoi).to.equal(true);
        expect(error.name).to.equal('ValidationError');
        expect(errors.password).to.equal("password must be at least 8 characters with uppercase letters and numbers.");
        done()
    });
})