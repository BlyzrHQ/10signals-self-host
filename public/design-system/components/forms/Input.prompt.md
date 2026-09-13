Text input with optional label, hint and inline error; 40px tall, 14px radius, grey border.

```jsx
<Input label="Email" ltr type="email" value={v} onChange={e=>setV(e.target.value)} />
```

Errors are ink text with ⚠, not red. Hero domain input uses `style={{minHeight:46}}`.
