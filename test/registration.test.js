const request  = require('supertest');

let baseUrl = 'http://localhost:3000';
let route = '/api/registration';

beforeAll((done) => {
    done();
});
  
afterAll((done) => {
    done();
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