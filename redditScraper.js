/**
 * Created by Moshe on 25/02/2017.
 */
'use strict'
/*var uniq = require('uniq');
var nums = [ 5, 2, 1, 3, 2, 5, 4, 2, 0, 1 ];
console.log(uniq(nums));*/

const snoowrap = require('snoowrap');

var user_agent_val = 'Comment Extraction by /u/mosma';
var client_id_val = 'vJpj1KFoozVc_A';
var client_secret_val = 'YR9SRuIqLVxBm7uNaZiGM60Jylw';
var username_val = 'mosma';
var password_val = 'themumin09';

const config = {
    user_agent: user_agent_val,
    client_id: client_id_val,
    client_secret: client_secret_val,
    username: username_val,
    password: password_val
}

const r = new snoowrap(config);

var submission_id = '5rrasx';
r.getSubmission(submission_id).expandReplies({limit:5, depth:5}).then(console.log);
