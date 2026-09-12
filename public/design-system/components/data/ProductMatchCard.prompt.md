The "By product" comparison: your product on the left (image, price, rival count, position summary) and each rival as a card with price, match verdict, difference, evidence, thumbs and next move.

```jsx
<ProductMatchCard product={{name:'Cedar & Smoke Soy Candle 8 oz',sku:'LO-CDR-8',price:'$34.00'}} rivals={[{id:'m1',name:'Cedarwood Smoke 8 oz',domain:'hearthwick.co',price:'$29.00',same:true,diff:'Rival 14.7% lower',basis:'Direct · same size, USD',evidence:'observed',confidence:'92% · high',next:'Review price',source:'ai'}]} />
```

A missing rival price renders "Not observed"; a missing image renders a dashed "No image" thumb.
