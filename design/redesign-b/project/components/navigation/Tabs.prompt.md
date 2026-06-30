The app's top-level navigation — emoji-labelled tabs, exactly like Streamlit's st.tabs.

```jsx
<Tabs
  defaultValue="gen"
  tabs={[
    { id: 'gen', icon: '📝', label: 'コマンド生成' },
    { id: 'debug', icon: '📜', label: '設定デバッグ' },
    { id: 'settings', icon: '⚙️', label: '詳細設定' },
  ]}
  onChange={setTab}
/>
```

Controlled via `value` or uncontrolled via `defaultValue`. Active tab gets a red underline.
