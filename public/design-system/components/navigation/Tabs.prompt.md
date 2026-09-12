Underline tab bar with counts; planned tabs sit after a divider, greyed with a dashed Planned badge, and are not selectable.

```jsx
<Tabs value={tab} onChange={setTab} tabs={[{key:'competitors',label:'Competitors',count:4},{key:'products',label:'Products',count:27},{key:'benchmark',label:'Benchmark',count:6},{key:'ads',label:'Advertising',planned:true}]} />
```

Roving tabindex; ←/→ follow reading direction, Home/End jump.
