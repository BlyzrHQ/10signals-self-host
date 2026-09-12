Run progress: a 2px blue bar plus a phase list with ● done, ◐ running (blue tint), ○ pending, ◔ skipped, ⚠ stopped.

```jsx
<ProgressPhases phases={['Report created','Crawling the company website','Building the catalog']} current={1} />
```

Wrap in a role=status region so phase changes are announced.
