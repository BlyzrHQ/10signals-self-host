CSS-grid data table with a header band, hairline rows, horizontal scroll under minWidth and an optional expandable drawer per row.

```jsx
<DataTable columns={[{key:'yours',label:'Your product',width:'minmax(180px,2fr)'},{key:'yp',label:'Your price',width:'84px'}]} rows={rows} openId={open} renderDrawer={r=><p>{r.reason}</p>} />
```

Use `render` to place EvidencePill, SourceTag, FeedbackThumbs and IconButton in cells.
