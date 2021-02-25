'use strict';

const
    tape = require('tape'), // https://github.com/substack/tape
    tapeNock = require('tape-nock'),
    C2S = require('../index'),
    c2s = new C2S('https://test11.andxor.it/c2s_test/api/','f.gorla@andxor.it', '123456'),
    testMode = (process.argv.length > 2 && process.argv[2] == 'local') ? 'lockdown' : 'record',
    test = tapeNock(tape, {
        fixtures: __dirname + '/nock/',
        mode: testMode,
    });

var sessiontoken; // TODO: i'd like to not store the token in a variable, but pass-through the .then chain

    function fixMultipart(scope) {
        // depending on content, Nock returns it as plaintext or Base64 encoded, accept both
        var separator = /----------------------------[0-9]{24}|2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d(3[0-9]){24}/g;
        scope.filteringRequestBody(function (body, recorded) {
            var sep = separator.exec(recorded);
            if (sep)
                return body.replace(separator, sep[0]);
            return body;
        });
    }
    

    test('login-logout', { after: fixMultipart }, function (t) {
        c2s.login({
            username: 'f.gorla@andxor.it',
            password: '123456'
        })            
    .then(function (data) {
            t.equal(data.loginSuccessful, true, 'Login successful');
            return c2s.logout({token: data.token});
        }).catch(function (err) {
            t.fail(err);
        }).then(function (data) {
            t.equal(data.logoutSuccessful, true,'Logout successful')
            t.end();
        });
    });



    test('download workflow', { after: fixMultipart }, function (t) {
        c2s.login({
            username: 'f.gorla@andxor.it',
            password: '123456'
        })            
    .then(function (data) {
            t.equal(data.loginSuccessful, true,'Login successful');
            
            sessiontoken = data.token;
            return c2s.listWorkflows({
                token: sessiontoken,
                cid: data.user.companies[0].cid,
                dateMin: 1598542564677
            });
        }).catch(function (err) {
            t.fail(err);
        }).then(function (data){   
            t.notEqual(data.search.results,0,'Found something');
            return c2s.downloadWorkflow({
                token: sessiontoken,
                wfid: data.workflows[0].wfid
            });
        }).catch(function (err) {
            t.fail(err);
        }).then(function (resp){
            t.ok((resp.toString('utf8',0,2)==='PK'), 'is a zip file');
                return c2s.logout({token: sessiontoken});
        }).catch(function (err) {
            t.fail(err);
        }).then(function (data) {
            t.equal(data.logoutSuccessful, true,'Logout successful')
            t.end();
        })

    });