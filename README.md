# O'Reilly 「初めての GraphQL」

5章 GraphQLサーバーの実装

## 手順
`.env`を以下のようにして配置すること
```.env
DB_HOST=mongodb://127.0.0.1:27017/<アプリ名>
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

### `apollo-server`のアプリ起動
```
$ npm run apollo
```

### `apollo-server-express`のアプリ起動
```
$ docker compose build

$ docker compose up

$ npm run express-apollo
```
