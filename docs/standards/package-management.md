# パッケージ管理規約

適用範囲: 依存パッケージ管理。

- pythonにおいては、poetryを利用します。
- javascriptにおいては、npmを利用します。

## poetryの操作

- pythonの依存パッケージを新規インストールする場合は、`pip install`ではなく`poetry add`を利用すること。
- テストコード専用の依存パッケージを新規インストールする場合は、`poetry add -G dev`を利用すること。
- pyproject.tomlにおいては、パッケージモードの有効化を禁止とします。

## npmの操作

- package.jsonにおいては、常にパッケージモードを利用するものとします。
- 頻出するコマンドのエイリアスについては、package.jsonに全て定義します。
