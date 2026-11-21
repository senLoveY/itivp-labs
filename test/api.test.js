const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('node:crypto');

const target = new URL(process.env.DATABASE_URL);
if (process.env.NODE_ENV !== 'pz22' || target.hostname !== '127.0.0.1' ||
    target.port !== '5433' || target.pathname !== '/microblog_pz22') {
    throw new Error('Tests must run only against the dedicated local pz22 database.');
}
const { User, Tweet, Comment, LoginLog, RequestLog, sequelize } = require('../models');
const app = require('../server');
sequelize.options.logging = false;
const server = app.listen(0, '127.0.0.1');
const prefix = 'pz22-test-' + randomUUID();
const ids = [];
const url = path => 'http://127.0.0.1:' + server.address().port + '/api' + path;
let count = 0;
async function request(method, path, body, token, status = 200) {
    const response = await fetch(url(path), {
        method, headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}),
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    count++;
    assert.equal(response.status, status, method + ' ' + path + ': ' + await response.clone().text());
    if (status === 204) { assert.equal(await response.text(), ''); return; }
    return response.json();
}

after(async () => {
    for (const id of ids) {
        const user = await User.findByPk(id);
        if (!user) continue;
        await Comment.destroy({ where: { authorId: id } });
        await Tweet.destroy({ where: { author: user.email } });
        await LoginLog.destroy({ where: { userId: id } });
        await user.destroy();
    }
    await new Promise(resolve => server.close(resolve));
    await sequelize.close();
});

test('CRUD, validation, authorization, filters and relations in PostgreSQL', async () => {
    await new Promise(resolve => server.listening ? resolve() : server.once('listening', resolve));
    const create = async suffix => {
        const response = await request('POST','/users', { email: prefix+suffix+'@example.com', password:'TestPass!9' },null,201);
        ids.push(response.id);
        assert.equal(response.passwordHash, undefined);
        assert.equal(response.password, undefined);
        return response;
    };
    const specification = await (await fetch(url('/../openapi.json'))).json();
    assert.deepEqual(Object.keys(specification.paths).sort(), [
        '/api/comments','/api/comments/{id}','/api/tweets','/api/tweets/{id}',
        '/api/users','/api/users/{id}','/auth/login'
    ].sort());
    assert.equal(specification.paths['/auth/login'].post.security.length,0);
    function checkRefs(value) {
        if (!value || typeof value !== 'object') return;
        if (value.$ref) {
            const target = value.$ref.slice(2).split('/').reduce((node,key) => node?.[key],specification);
            assert.ok(target, value.$ref);
        }
        Object.values(value).forEach(checkRefs);
    }
    checkRefs(specification);
    const operations = Object.entries(specification.paths).filter(([path]) => path.startsWith('/api/'));
    assert.equal(operations.reduce((sum, [,methods]) => sum + Object.keys(methods).length,0),18);
    const docs = await fetch(url('/../api-docs/'));
    assert.equal(docs.status,200);
    const user = await create('-owner');
    const login = await fetch(url('/../auth/login'), {method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email:user.email,password:'TestPass!9'})});
    assert.equal(login.status,200);
    const loginData = await login.json();
    assert.ok(loginData.token);
    const other = await create('-other');
    const token = loginData.token;
    const otherToken = jwt.sign({ id:other.id, role:'admin' },process.env.JWT_SECRET);
    // A forged role claim does not change the current role from the database.
    await request('GET','/users',undefined,otherToken,403);
    await request('GET','/users',undefined,null,401);
    const admin = await User.create({email:prefix+'-admin@example.com',passwordHash:'not-a-login-password',role:'admin'});
    ids.push(admin.id);
    const adminToken = jwt.sign({id:admin.id},process.env.JWT_SECRET);
    const list = await request('GET','/users',undefined,adminToken);
    assert.ok(list.some(row => row.id === user.id));
    assert.ok(list.every(row => !Object.hasOwn(row,'passwordHash')));
    await request('GET','/users/'+user.id,undefined,token);
    await request('GET','/users/'+user.id,undefined,otherToken,403);
    await request('PATCH','/users/'+user.id,{role:'admin'},token,400);
    await request('PATCH','/users/'+user.id,{email:'bad'},token,400);
    await request('POST','/users',{email:user.email,password:'TestPass!9'},null,409);
    await request('PUT','/users/'+user.id,{email:user.email},token,400);
    await request('PUT','/users/'+user.id,{email:user.email,password:'NewPass!9'},token);
    const tweet = await request('POST','/tweets',{authorId:user.id,content:'Test',hashtags:['React','#react']},token,201);
    assert.deepEqual(tweet.hashtags,['#react']);
    await request('GET','/tweets/'+tweet.id);
    const tweets = await request('GET','/tweets?authorId='+user.id);
    assert.ok(tweets.some(row => row.id === tweet.id));
    await request('PATCH','/tweets/'+tweet.id,{content:'Forbidden'},otherToken,403);
    await request('PATCH','/tweets/'+tweet.id,{content:'No JWT'},null,401);
    await request('PATCH','/tweets/'+tweet.id,{content:'Expired'},jwt.sign({id:user.id},process.env.JWT_SECRET,{expiresIn:-1}),401);
    await request('PUT','/tweets/'+tweet.id,{content:'Incomplete'},token,400);
    await request('PUT','/tweets/'+tweet.id,{authorId:user.id,content:'PUT',hashtags:[]},token);
    await request('PATCH','/tweets/'+tweet.id,{content:'PATCH'},token);
    await request('PATCH','/tweets/'+tweet.id,{},token,400);
    await request('PATCH','/tweets/'+tweet.id,{content:' '},token,400);
    await request('GET','/tweets/nope',undefined,null,400);
    await request('GET','/tweets/2147483647',undefined,null,404);
    const renamed = prefix+'-renamed@example.com';
    await request('PATCH','/users/'+user.id,{email:renamed},token);
    assert.equal((await request('GET','/tweets/'+tweet.id)).author,renamed);
    const comment = await request('POST','/comments',{authorId:user.id,tweetId:tweet.id,text:'Hello'},token,201);
    await request('POST','/comments',{authorId:user.id,tweetId:2147483647,text:'Hello'},token,400);
    await request('GET','/comments/'+comment.id);
    assert.ok((await request('GET','/comments?tweetId='+tweet.id+'&authorId='+user.id)).some(row=>row.id===comment.id));
    await request('GET','/comments');
    await request('PUT','/comments/'+comment.id,{authorId:user.id,tweetId:tweet.id,text:'PUT'},token);
    await request('PATCH','/comments/'+comment.id,{text:'PATCH'},token);
    await request('PATCH','/comments/'+comment.id,{text:'Forbidden'},otherToken,403);
    await request('DELETE','/users/'+user.id,undefined,token,409);
    await request('DELETE','/comments/'+comment.id,undefined,token,204);
    await request('GET','/comments/'+comment.id,undefined,null,404);
    const cascade = await request('POST','/comments',{authorId:other.id,tweetId:tweet.id,text:'Cascade'},otherToken,201);
    await request('DELETE','/tweets/'+tweet.id,undefined,otherToken,403);
    await request('DELETE','/tweets/'+tweet.id,undefined,token,204);
    assert.equal(await Comment.findByPk(cascade.id),null);
    await request('DELETE','/tweets/'+tweet.id,undefined,token,404);
    await request('DELETE','/users/'+user.id,undefined,token,204);
    await request('GET','/users/'+user.id,undefined,token,401);
    const malformed = await fetch(url('/tweets'), { method:'POST',headers:{'Content-Type':'application/json'},body:'{' });
    assert.equal(malformed.status,400);
    assert.match(malformed.headers.get('content-type'),/application\/json/);
    console.log('Verified '+count+' HTTP requests plus malformed JSON and database cascade.');
});

test('Postman collection runs end to end against the same app', async () => {
    const collection = require('../postman/pz22.postman_collection.json');
    const variables = new Map(collection.variable.map(variable => [variable.key,variable.value]));
    variables.set('baseUrl','http://127.0.0.1:'+server.address().port);
    const interpolate = value => value.replace(/\{\{([^}]+)\}\}/g, (_,name) => {
        if (!variables.has(name) || variables.get(name) === '') throw new Error('Missing variable: '+name);
        return String(variables.get(name));
    });
    for (const item of collection.item) {
        let result;
        const pm = {
            collectionVariables: { set: (key,value) => variables.set(key,value) },
            variables: { replaceIn: value => value.replace('{{$guid}}',randomUUID()) },
            test: (name,check) => check(),
            get response() {
                return {
                    json: () => result.data,
                    to: { have: { status: status => assert.equal(result.status,status,item.name) } }
                };
            }
        };
        for (const event of item.event.filter(event=>event.listen==='prerequest')) {
            new Function('pm',event.script.exec.join('\n'))(pm);
        }
        const headers = Object.fromEntries(item.request.header.map(header=>[header.key,interpolate(header.value)]));
        const response = await fetch(interpolate(item.request.url),{
            method:item.request.method,headers,
            body:item.request.body ? interpolate(item.request.body.raw) : undefined
        });
        result={status:response.status,data:response.status===204?null:await response.json()};
        if (item.request.url.endsWith('/api/users') && item.request.method==='POST' && response.status===201) ids.push(result.data.id);
        for (const event of item.event.filter(event=>event.listen==='test')) {
            new Function('pm',event.script.exec.join('\n'))(pm);
        }
    }
    console.log('Executed '+collection.item.length+' documented Postman requests successfully.');
});
