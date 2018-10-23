const request = require('supertest');
const app     = require('../app');

describe('POST /api/registraton user registration API', () => {
    it( 'Validate email , password and confirm password is required' , () => {
        return request(app)
                .post('/api/registration')
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
    })

    it('Validate email format', () => {
        return request(app)
                .post('/api/registration')
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
            })

    it('Validate pasword match with regx', () => {
        return request(app)
                .post('/api/registration')
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
    })

    it('Validate password & confirm password match', () => {
        return request(app)
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

    it('Validate email address already registred', () => {
        return request(app)
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
                                email: "This email address already registred."
                            }
                        }
                    });
                });
    });
});