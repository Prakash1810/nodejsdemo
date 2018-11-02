const request  = require('supertest');

let baseUrl = 'http://localhost:3000';
let route = '/api/registration';

describe('Intergration testing for POST:- /api/registraton', () => {
    it( 'Validate email , password and confirm password is required' , (done) => {
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
                    done();
                });
    });

    it('Validate email format', (done) => {
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
                    done();
                });
    });

    it('Validate pasword match with regx', (done) => {
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
                    done();
                });
    });

    it('Validate password & confirm password match', (done) => {
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
                    done();
                });
    });

    it('Validate email address already registred', (done) => {
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
                    done();
                });
    });
});
