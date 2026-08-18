import { semanticDiff } from './src/utils/semanticDiff.ts';

const left = [
  { description: 'red and sweat', id: 1, name: 'apple' },
  { description: 'sour', id: 3, name: 'citrus' },
  { description: 'yellow', id: 2, name: 'banana' },
];
const right = [
  { description: 'red and sweat', id: 10, name: 'apple' },
  { id: 20, name: 'banana', description: 'easy to peal' },
  { id: 30, name: 'citrus', description: 'sour' },
];

const result = semanticDiff(left, right);
console.log('=== Delta (what changes were detected) ===');
console.log(JSON.stringify(result.delta, null, 2));
console.log('');
console.log('=== Summary ===');
console.log('Left items:', left.length, 'Right items:', right.length);
if (result.delta && result.delta._t === 'a') {
  const keys = Object.keys(result.delta).filter(k => k !== '_t');
  console.log('Matched pairs (each is a modification, not added/removed):', keys.length);
  for (const k of keys) {
    console.log(`  Item ${k}:`, JSON.stringify(result.delta[k]));
  }
} else {
  console.log('Delta type:', result.delta && result.delta._t);
}
