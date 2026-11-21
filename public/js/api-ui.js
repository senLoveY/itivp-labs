(() => {
    const account = document.querySelector('#api-account');
    if (!account) return;
    const tokenKey = 'pz22ApiToken';
    let token = sessionStorage.getItem(tokenKey);
    let user = null;

    function node(tag, text, className) {
        const element = document.createElement(tag);
        if (text !== undefined) element.textContent = text;
        if (className) element.className = className;
        return element;
    }
    function button(text, action) {
        const element = node('button', text);
        element.type = 'button';
        element.addEventListener('click', action);
        return element;
    }
    async function request(path, method = 'GET', body) {
        const response = await fetch(path, {
            method,
            headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}),
                ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
            body: body === undefined ? undefined : JSON.stringify(body)
        });
        const data = response.status === 204 ? null : await response.json();
        if (!response.ok) {
            if (response.status === 401 && token) {
                sessionStorage.removeItem(tokenKey);
                token = null;
                user = null;
                location.replace('/login');
            }
            throw new Error(data?.error || 'Ошибка запроса: ' + response.status);
        }
        return data;
    }
    function input(label, name, type = 'text') {
        const wrapper = node('label', label);
        const field = node('input');
        field.name = name;
        field.type = type;
        field.required = true;
        field.autocomplete = type === 'email' ? 'username' : 'current-password';
        wrapper.append(field);
        return { wrapper, field };
    }
    function message(parent, error) {
        const area = parent.querySelector('.api-message');
        area.textContent = error || '';
    }
    function renderAccount() {
        account.replaceChildren();
        const isLogin = document.body.classList.contains('auth-page');
        if (user) {
            if (isLogin) { location.replace('/'); return; }
            account.append(node('span', user.email, 'account-email'), button('Выйти', () => {
                token = null;
                user = null;
                sessionStorage.removeItem(tokenKey);
                location.replace('/login');
            }));
            return;
        }
        if (!isLogin) { location.replace('/login'); return; }
        let registering = false;
        const title = node('h1', 'С возвращением');
        const intro = node('p', 'Войдите, чтобы читать обсуждения и публиковать посты.', 'api-hint');
        const form = node('form');
        const email = input('Email', 'email', 'email');
        const password = input('Пароль', 'password', 'password');
        const submit = node('button', 'Войти');
        submit.type = 'submit';
        submit.className = 'primary';
        const register = button('Создать аккаунт', () => {
            registering = !registering;
            title.textContent = registering ? 'Создать аккаунт' : 'С возвращением';
            intro.textContent = registering ? 'Зарегистрируйтесь, чтобы присоединиться к обсуждению.' : 'Войдите, чтобы читать обсуждения и публиковать посты.';
            submit.textContent = registering ? 'Зарегистрироваться' : 'Войти';
            register.textContent = registering ? 'Уже есть аккаунт? Войти' : 'Создать аккаунт';
            password.field.autocomplete = registering ? 'new-password' : 'current-password';
            password.field.minLength = registering ? 8 : 1;
            hint.hidden = !registering;
            error.textContent = '';
        });
        register.className = 'auth-switch';
        const hint = node('p', 'Пароль: 8–72 символа, заглавная и строчная латинские буквы, цифра и спецсимвол @$!%*?&.', 'api-hint');
        hint.hidden = true;
        const error = node('p', '', 'api-message');
        error.setAttribute('role', 'status');
        form.append(email.wrapper, password.wrapper, hint, error, submit);
        async function signIn(create) {
            if (!form.reportValidity()) return;
            submit.disabled = register.disabled = true;
            error.textContent = '';
            try {
                const data = { email: email.field.value.trim().toLowerCase(), password: password.field.value };
                if (create) await request('/api/users', 'POST', data);
                const login = await request('/auth/login', 'POST', data);
                token = login.token;
                const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
                user = await request('/api/users/' + payload.id);
                sessionStorage.setItem(tokenKey, token);
                location.replace('/');
            } catch (err) {
                token = null;
                user = null;
                sessionStorage.removeItem(tokenKey);
                error.textContent = err.message;
            } finally {
                submit.disabled = register.disabled = false;
            }
        }
        form.addEventListener('submit', e => { e.preventDefault(); signIn(registering); });
        account.append(title, intro, form, register);
    }

    function canEdit(author) {
        return user && (user.role === 'admin' || (typeof author === 'number' ? user.id === author : user.email === author));
    }
    function editor(card, values, save, onSaved) {
        if (card.querySelector('.api-editor')) return;
        const form = node('form', undefined, 'api-editor');
        for (const [name, value] of Object.entries(values)) {
            const label = node('label', name === 'hashtags' ? 'Теги через пробел' : 'Текст');
            const field = node(name === 'hashtags' ? 'input' : 'textarea');
            field.name = name;
            field.value = value;
            field.maxLength = name === 'hashtags' ? 300 : 280;
            field.required = name !== 'hashtags';
            label.append(field);
            form.append(label);
        }
        const submit = node('button', 'Сохранить');
        submit.type = 'submit';
        const cancel = button('Отмена', () => form.remove());
        const error = node('p', '', 'api-message');
        error.setAttribute('role', 'status');
        form.append(submit, cancel, error);
        form.addEventListener('submit', async e => {
            e.preventDefault();
            submit.disabled = cancel.disabled = true;
            try {
                await save(Object.fromEntries(new FormData(form)));
                await onSaved();
            } catch (err) { error.textContent = err.message; }
            finally { submit.disabled = cancel.disabled = false; }
        });
        card.append(form);
        form.querySelector('textarea').focus();
    }
    const tagList = text => text.split(/\s+/).filter(Boolean);

    const feed = document.querySelector('#api-feed');
    const createTweet = document.querySelector('#api-tweet-form');
    if (createTweet) createTweet.addEventListener('submit', async e => {
        e.preventDefault();
        const submit = createTweet.querySelector('button');
        submit.disabled = true;
        message(feed, '');
        try {
            const data = Object.fromEntries(new FormData(createTweet));
            await request('/api/tweets', 'POST', { content: data.content, hashtags: tagList(data.hashtags), authorId: user.id });
            createTweet.reset();
            await loadTweets();
        } catch (err) { message(feed, err.message); }
        finally { submit.disabled = false; }
    });
    async function loadTweets() {
        if (!feed) return;
        feed.hidden = !user;
        if (!user) return;
        createTweet.hidden = false;
        message(feed, 'Загрузка…');
        try {
            const tweets = await request('/api/tweets');
            const list = document.querySelector('#api-tweet-list');
            list.replaceChildren();
            for (const tweet of tweets) {
                const card = node('article', undefined, 'tweet-card');
                const link = node('a', 'Комментарии');
                link.href = '/item/' + tweet.id;
                card.append(node('strong', tweet.author), node('p', tweet.content), node('small', (tweet.hashtags || []).join(' ')), link);
                if (canEdit(tweet.author)) {
                    card.append(button('Изменить', () => editor(card,
                        { content: tweet.content, hashtags: (tweet.hashtags || []).join(' ') },
                        data => request('/api/tweets/' + tweet.id, 'PATCH', { content: data.content, hashtags: tagList(data.hashtags) }), loadTweets)));
                    card.append(button('Удалить', async () => {
                        if (!confirm('Удалить пост и его комментарии?')) return;
                        try { await request('/api/tweets/' + tweet.id, 'DELETE'); await loadTweets(); }
                        catch (err) { message(feed, err.message); }
                    }));
                }
                list.append(card);
            }
            message(feed, tweets.length ? '' : 'Публикаций пока нет.');
        } catch (err) { message(feed, err.message); }
    }

    const comments = document.querySelector('.api-comments');
    const commentForm = comments?.querySelector('form');
    if (commentForm) commentForm.addEventListener('submit', async e => {
        e.preventDefault();
        const submit = commentForm.querySelector('button');
        submit.disabled = true;
        message(comments, '');
        try {
            await request('/api/comments', 'POST', {
                text: new FormData(commentForm).get('text'),
                authorId: user.id, tweetId: Number(comments.dataset.tweetId)
            });
            commentForm.reset();
            await loadComments();
        } catch (err) { message(comments, err.message); }
        finally { submit.disabled = false; }
    });
    async function loadComments() {
        if (!comments) return;
        if (!user) return;
        commentForm.hidden = false;
        comments.querySelector('.api-login-hint').hidden = Boolean(user);
        message(comments, 'Загрузка…');
        try {
            const data = await request('/api/comments?tweetId=' + comments.dataset.tweetId);
            const list = comments.querySelector('.api-comment-list');
            list.replaceChildren();
            for (const comment of data) {
                const card = node('article', undefined, 'tweet-card');
                card.append(node('strong', 'Пользователь №' + comment.authorId), node('p', comment.text),
                    node('small', new Date(comment.createdAt).toLocaleString('ru-RU')));
                if (canEdit(comment.authorId)) {
                    card.append(button('Изменить', () => editor(card, { text: comment.text },
                        data => request('/api/comments/' + comment.id, 'PATCH', data), loadComments)));
                    card.append(button('Удалить', async () => {
                        if (!confirm('Удалить комментарий?')) return;
                        try { await request('/api/comments/' + comment.id, 'DELETE'); await loadComments(); }
                        catch (err) { message(comments, err.message); }
                    }));
                }
                list.append(card);
            }
            message(comments, data.length ? '' : 'Комментариев пока нет.');
        } catch (err) { message(comments, err.message); }
    }
    function refresh() { loadTweets(); loadComments(); }

    async function init() {
        if (token) {
            try {
                const data = JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
                user = await request('/api/users/' + data.id);
            } catch (err) {
                if (token) {
                    account.replaceChildren(node('span', err.message), button('Повторить', init),
                        button('Выйти', () => { sessionStorage.removeItem(tokenKey); location.replace('/login'); }));
                    return;
                }
            }
        }
        renderAccount();
        refresh();
    }
    init();
})();
