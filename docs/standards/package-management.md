# パッケージ管理規約

適用範囲: 依存パッケージ管理。

- pythonにおいては、poetryを利用します。
- javascriptにおいては、bunを利用します。

## poetryの操作

- pythonの依存パッケージを新規インストールする場合は、`pip install`ではなく`poetry add`を利用すること。
- テストコード専用の依存パッケージを新規インストールする場合は、`poetry add -G dev`を利用すること。
- pyproject.tomlにおいては、パッケージモードの有効化を禁止とします。

## bunの操作

- javascriptの依存パッケージを新規インストールする場合は、`npm install`ではなく`bun add`を利用すること。
- 開発専用の依存パッケージを新規インストールする場合は、`bun add -d`を利用すること。
- package.jsonにおいては、常にパッケージモードを利用するものとします。
- 頻出するコマンドのエイリアスについては、package.jsonに全て定義します。
- ロックファイル(`bun.lock`)は必ずコミットします。
