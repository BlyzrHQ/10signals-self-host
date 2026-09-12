Single-select pill chips with counts, used to filter products by competitor ("All 27 · hearthwick.co 12 …").

```jsx
<FilterChips label="Competitor" value={f} onChange={setF} options={[{key:'',label:'All',count:27},{key:'hearthwick.co',label:'hearthwick.co',count:12}]} />
```

Labels are forced LTR because they are usually domains.
