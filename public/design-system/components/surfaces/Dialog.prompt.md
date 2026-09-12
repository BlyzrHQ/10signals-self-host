Modal at the system's only elevation: white, 20px radius, soft shadow, over an ink scrim.

```jsx
<Dialog open={open} title="Delete account?" onClose={close} actions={<><Button variant="secondary">Cancel</Button><Button>Delete</Button></>}>Saved report links stay reachable.</Dialog>
```

Used sparingly: confirmations and the manual share-link fallback.
