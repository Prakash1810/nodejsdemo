const { assert , expect, should } = require('chai');
const registration  = require('../src/core/registration');

const request  = require('supertest');
let baseUrl = 'http://localhost:3000';
let route = '/api/registration';

before((done) => {
    done();
});
  
after((done) => {
    done();
});

var isValidRequest = {
                        'email' : 'satz@mail.com',
                        'password'  : '1234567S',
                        'password_confirmation' : '1234567S'
                    };
var errors = {};

describe('Registration :-', () => {
    it ('should check all the fields are required', (done) => {
        let { error } = registration.validate({});
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });
        expect(error.isJoi).to.equal(true);
        expect(error.name).to.equal('ValidationError');
        expect(errors.email).to.equal("\"email\" is required");
        expect(errors.password).to.equal("\"password\" is required");
        expect(errors.password_confirmation).to.equal("\"password confirmation\" is required");
        done()
    });

    it ('should match the password and confirm password', (done) => {
        isValidRequest.password  = '1234567SS';
        let { error } = registration.validate(JSON.stringify(isValidRequest));
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });
        expect(error.isJoi).to.equal(true);
        expect(error.name).to.equal('ValidationError');
        expect(errors.password_confirmation).to.equal("\"password confirmation\" must match password");
        done()
    });

    it ('should match the password strength', (done) => {
        isValidRequest.password = '123456';
        isValidRequest.password_confirmation = '123456';
        let { error } = registration.validate(JSON.stringify(isValidRequest));
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });
        expect(error.isJoi).to.equal(true);
        expect(error.name).to.equal('ValidationError');
        expect(errors.password).to.equal("password must be at least 8 characters with uppercase letters and numbers.");
        done()
    });

    it ('should be validate email format', (done) => {
        isValidRequest.password = '123456';
        isValidRequest.password_confirmation = '123456';
        isValidRequest.email = 'satz@gmail';
        let { error } = registration.validate(JSON.stringify(isValidRequest));
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });
        expect(error.isJoi).to.equal(true);
        expect(error.name).to.equal('ValidationError');
        expect(errors.password).to.equal("password must be at least 8 characters with uppercase letters and numbers.");
        done()
    });

    it ('should be check unique email address', (done) => {
        // let isUnique = registration.checkEmailisUnique('satz@gmail.com');
        // isUnique.then((result) => {
        //     console.log(result)
        // })
        // expect(isUnique).to.equal(true);
        done()
    });

    it ('should check all the fields are entered', (done) => {
        isValidRequest.password = '1234567S';
        isValidRequest.password_confirmation = '1234567S';
        isValidRequest.email = 'satz@gmail.com';
        let { error } = registration.validate(JSON.stringify(isValidRequest));
        expect(error).to.equal(null);
        done()
    });
});

describe('Intergration testing for POST:- /api/registraton', () => {
    it( 'Validate email , password and confirm password is required' , () => {
        request(baseUrl)
        .post(route)
        .set('Accept', 'application/json')
        .send({})
        .expect(400)
        .then((res) => {
            expect(res.body).toMatchObject({
                data: {
                    attributes: {
                        email: "\"email\" is required",
                        password: "\"password\" is required",
                        password_confirmation: "\"password confirmation\" is required"
                    }
                }
            });
        });
    });

    it('Validate email format', () => {
        request(baseUrl)
        .post(route)
        .set('Accept', 'application/json')
        .send({
            email: "satzmail.com",
            password: "1234567S",
            password_confirmation: "1234567S",
            refferal_code: null
        })
        .expect(400)
        .then((res) => {
            expect(res.body).toMatchObject({
                data: {
                    attributes: {
                        email: 'Invalid email address.'
                    }
                }
            });
        });
    });

    it('Validate pasword match with regx', () => {
        request(baseUrl)
        .post(route)
        .set('Accept', 'application/json')
        .send({
            email: "satz@mail.com",
            password: "1234567",
            password_confirmation: "1234567"
        })
        .expect(400)
        .then((res) => {
            expect(res.body).toMatchObject({
                data: {
                    attributes: {
                        password: "password must be at least 8 characters with uppercase letters and numbers."
                    }
                }
            });
        });
    });

    it('Validate password & confirm password match', () => {
        request(baseUrl)
        .post('/api/registration')
        .set('Accept', 'application/json')
        .send({
            email: "satz@mail.com",
            password: "1234567S",
            password_confirmation: "1234567"
        })
        .expect(400)
        .then((res) => {
            expect(res.body).toMatchObject({
                data: {
                    attributes: {
                        password_confirmation: "\"password confirmation\" must match password",
                    }
                }
            });
        });
    });

    it('Successfully user registred', () => {
        request(baseUrl)
        .post('/api/registration')
        .set('Accept', 'application/json')
        .send({
            email: "satz@mail.com",
            password: "1234567S",
            password_confirmation: "1234567S"
        })
        .expect(200)
        .then((res) => {
            expect(res.body).toMatchObject({
                data: {
                    id: false,
                    type: "users",
                    attributes: {
                        message: "We have sent a confirmation email to your registered email address. satz@mail.com. Please follow the instructions in the email to continue.",
                    }
                }
            });
        });
    });

    it('Validate email address already registred', () => {
        request(baseUrl)
        .post('/api/registration')
        .set('Accept', 'application/json')
        .send({
            email: "satz@mail.com",
            password: "1234567S",
            password_confirmation: "1234567S"
        })
        .expect(400)
        .then((res) => {
            expect(res.body).toMatchObject({
                data: {
                    attributes: {
                        email: "This email address already exits."
                    }
                }
            });
        });
    });
});