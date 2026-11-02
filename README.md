# Микроблог (ИТиВП, лабораторные работы)

Сервер: Node.js + Express + PostgreSQL (Sequelize), аутентификация JWT.
Комментарии к твитам хранятся в MongoDB (Mongoose) – лабораторная работа №6.
Клиент: React + Vite (папка `client`).

## Запуск сервера

```
npm install
```

Создать файл `.env` по образцу `.env.example`:

```
DATABASE_URL=строка подключения к PostgreSQL
JWT_SECRET=любой секретный ключ
MONGO_URI=строка подключения к MongoDB
```

### Подключение MongoDB Atlas

1. Создать бесплатный кластер (M0) на [MongoDB Atlas](https://cloud.mongodb.com).
2. В разделе **Database Users** создать пользователя с ролью «Read and write to any database».
3. В разделе **Network Access** добавить свой IP (или `0.0.0.0/0` для учебного проекта).
4. Скопировать строку подключения (**Connect → Drivers**), подставить логин, пароль и имя базы:

```
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/microblog_mdb?retryWrites=true&w=majority&authSource=admin
```

Параметр `authSource=admin` нужен, если DNS не отдаёт TXT-запись кластера – без него подключение
падает с ошибкой `bad auth : Authentication failed`. Вместо Atlas можно использовать локальный MongoDB:
`MONGO_URI=mongodb://localhost:27017/microblog_mdb`.

Коллекция `comments` и индексы создаются автоматически при первом запуске, миграции для MongoDB не нужны.

Применить миграции и (по желанию) заполнить базу тестовыми твитами:

```
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
```

Запустить:

```
npm run dev
```

Сервер работает на http://localhost:3000, документация API – http://localhost:3000/api-docs.
При успешном подключении в консоли появится `MongoDB connected`.

## API комментариев (MongoDB)

Комментарий хранится одним документом: ссылка на твит из PostgreSQL (`tweetId`), текст, лайки
и вложенные массивы `replies` (ответы), `editHistory` (история правок), `likedBy`.

| Метод | Путь | Описание |
|---|---|---|
| GET | `/comments?tweetId=` | список комментариев |
| GET | `/comments/:id` | комментарий по id |
| POST | `/comments` | создать комментарий (`tweetId`, `text`) |
| PUT | `/comments/:id` | изменить текст, старый сохраняется в `editHistory` |
| DELETE | `/comments/:id` | удалить, в ответе возвращается удалённый документ |
| PATCH | `/comments/:id/like` | поставить / снять лайк |
| POST | `/comments/:id/replies` | добавить ответ (`$push`) |
| PATCH | `/comments/:id/replies/:replyId/like` | лайк ответа (`$inc` элемента массива) |
| DELETE | `/comments/:id/replies/:replyId` | удалить ответ (`$pull`) |
| GET | `/comments/stats` | топ твитов по комментариям (aggregation pipeline) |
| GET | `/comments/counts?tweetIds=1,2` | количество комментариев для нескольких твитов |

Изменение и удаление доступно автору или администратору. При удалении твита его комментарии
удаляются из MongoDB каскадно.

## Запуск клиента

```
cd client
npm install
```

Создать файл `client/.env` по образцу `client/.env.example`:

```
VITE_API_URL=http://localhost:3000
```

Запустить:

```
npm run dev
```

Открыть адрес, который покажет Vite (обычно http://localhost:5173).

## Вход

На странице входа нажать «Зарегистрироваться», ввести email и пароль.
Пароль: минимум 8 символов, заглавная и строчная буква, цифра и спецсимвол.
После регистрации вход выполняется автоматически.
