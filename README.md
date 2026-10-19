# Микроблог (ИТиВП, лабораторные работы)

Сервер: Node.js + Express + PostgreSQL (Sequelize), аутентификация JWT.
Клиент: React + Vite (папка `client`).

## Запуск сервера

```
npm install
```

Создать файл `.env` по образцу `.env.example`:

```
DATABASE_URL=строка подключения к PostgreSQL
JWT_SECRET=любой секретный ключ
```

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

Пользователь регистрируется через `POST /auth/register` (например, в Swagger на `/api-docs`).
Пароль: минимум 8 символов, заглавная и строчная буква, цифра и спецсимвол.
После этого можно войти в клиенте по email и паролю.
